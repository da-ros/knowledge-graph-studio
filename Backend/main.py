from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import json
import uuid
from datetime import datetime
from dotenv import load_dotenv, find_dotenv
from pymongo import MongoClient
from knowledge_graph_extractor import enhance_text_for_graph_extraction, get_llm_transformer, simplify_relationships, normalize_entity_names, check_orphaned_entities
from langchain_core.documents import Document

load_dotenv(find_dotenv())

app = FastAPI(title="Text2Graph API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
def get_mongodb_client():
    uri = os.getenv("MONGODB_URI")
    if not uri:
        raise HTTPException(status_code=500, detail="MongoDB URI not configured")
    return MongoClient(uri)

# Pydantic models
class TextInput(BaseModel):
    text: str
    enhance: bool = True

class GraphMetadata(BaseModel):
    id: str
    name: str
    version: str
    tags: List[str]
    nodes: int
    edges: int
    created_at: str
    updated_at: str

class GraphData(BaseModel):
    nodes: List[Dict[str, Any]]
    links: List[Dict[str, Any]]

class ProcessedGraph(BaseModel):
    metadata: GraphMetadata
    data: GraphData

# API Endpoints
@app.get("/")
async def root():
    return {"message": "Text2Graph API is running"}

@app.get("/api/health")
async def health_check():
    try:
        client = get_mongodb_client()
        database = client["embedded_graph_2"]
        collections = database.list_collection_names()
        client.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "collections": collections,
            "collection_count": len(collections)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@app.post("/api/process-text", response_model=ProcessedGraph)
async def process_text(input_data: TextInput):
    try:
        if not input_data.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")
        
        print("🚀 Starting text processing...")
        
        # Enhance text if requested
        if input_data.enhance:
            print("📝 Enhancing text for better graph extraction...")
            enhanced_text = enhance_text_for_graph_extraction(input_data.text)
        else:
            enhanced_text = input_data.text
        
        # Extract graph
        print("🤖 Extracting graph using LLM...")
        documents = [Document(page_content=enhanced_text)]
        graph_documents = get_llm_transformer().convert_to_graph_documents(documents)
        print("✅ Graph extraction completed")
        
        # Simplify and normalize relationships
        print("🔗 Processing relationships...")
        original_relationships = graph_documents[0].relationships
        simplified_relationships = simplify_relationships(original_relationships)
        normalized_nodes, normalized_relationships = normalize_entity_names(
            graph_documents[0].nodes, simplified_relationships
        )
        print(f"📊 Found {len(normalized_nodes)} nodes and {len(normalized_relationships)} relationships")
        
        # Check for orphaned entities
        orphaned = check_orphaned_entities(normalized_nodes, normalized_relationships)
        
        # Validate we have data to process
        if not normalized_nodes:
            raise HTTPException(status_code=400, detail="No nodes found in the processed text")
        
        # Generate unique ID and metadata
        graph_id = str(uuid.uuid4())
        current_time = datetime.now().isoformat()
        
        print(f"Processing graph with ID: {graph_id}")
        print(f"Number of nodes: {len(normalized_nodes)}")
        print(f"Number of relationships: {len(normalized_relationships)}")
        
        # Create collections based on node types
        collections = set()
        for node in normalized_nodes:
            collections.add(node.type)
        
        print(f"Collections needed: {collections}")
        
        # Store in MongoDB
        print("💾 Storing graph in database...")
        client = get_mongodb_client()
        database = client["embedded_graph_2"]
        
        try:
            # Create collections (only if they don't exist)
            existing_collections = database.list_collection_names()
            for collection in collections:
                if collection not in existing_collections:
                    database.create_collection(collection)
                    print(f"Created new collection: {collection}")
                else:
                    print(f"Using existing collection: {collection}")
            
            # Create MongoDB documents
            mongo_documents = []
            node_relationship_types = {}
            
            # Build relationship types per node
            for node in normalized_nodes:
                node_relationship_types[node.id] = set()
                for rel in normalized_relationships:
                    if rel.source.id == node.id:
                        node_relationship_types[node.id].add(rel.type)
            
            # Create documents for each node
            for node in normalized_nodes:
                document_dict = {
                    'id': node.id,
                    'type': node.type,
                    'd3_edges': [],
                    'd3_target_nodes': [],
                    'd3_source_node': {'id': node.id, 'group': 0, 'level': 1, 'label': node.id},
                    'graph_id': graph_id,
                    'created_at': current_time
                }
                
                # Add relationship types as empty arrays
                document_relations = node_relationship_types[node.id]
                for document_relation in document_relations:
                    document_dict[document_relation] = []
                
                # Add relationships
                for rel in normalized_relationships:
                    if rel.source.id == node.id:
                        document_dict[rel.type].append(rel.target.id)
                        if rel.target.id not in [n.id for n in normalized_nodes]:
                            document_dict['d3_target_nodes'].append({
                                'id': rel.target.id,
                                'group': 1,
                                'level': 2,
                                'label': rel.target.id
                            })
                        document_dict['d3_edges'].append({
                            'source': node.id,
                            'target': rel.target.id,
                            'strength': 0.7,
                            'linkName': rel.type
                        })
                
                mongo_documents.append(document_dict)
            
            # Insert into MongoDB
            for mongo_document in mongo_documents:
                try:
                    collection = database[mongo_document['type']]
                    result = collection.insert_one(mongo_document)
                    print(f"Inserted document {result.inserted_id} into collection {mongo_document['type']}")
                except Exception as insert_error:
                    print(f"Error inserting document into {mongo_document['type']}: {insert_error}")
                    raise insert_error
            
            # Create D3.js compatible data
            node_map = {}
            links = []
            
            # Collect all nodes
            for node in normalized_nodes:
                node_map[node.id] = {
                    'id': node.id,
                    'group': 0,
                    'level': 1,
                    'label': node.id
                }
            
            # Collect all links
            for rel in normalized_relationships:
                links.append({
                    'source': rel.source.id,
                    'target': rel.target.id,
                    'strength': 0.7,
                    'linkName': rel.type
                })
            
            # Create metadata
            metadata = GraphMetadata(
                id=graph_id,
                name=f"Graph {graph_id[:8]}",
                version="v1.0",
                tags=["auto-generated"],
                nodes=len(normalized_nodes),
                edges=len(normalized_relationships),
                created_at=current_time,
                updated_at=current_time
            )
            
            # Create graph data
            graph_data = GraphData(
                nodes=list(node_map.values()),
                links=links
            )
            
            return ProcessedGraph(metadata=metadata, data=graph_data)
            
        finally:
            client.close()
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Unexpected error processing text: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing text: {str(e)}")

@app.get("/api/graphs", response_model=List[GraphMetadata])
async def get_graphs():
    try:
        client = get_mongodb_client()
        database = client["embedded_graph_2"]
        
        # Get all unique graph IDs across all collections
        all_graph_ids = set()
        collection_names = database.list_collection_names()
        
        for collection_name in collection_names:
            collection = database[collection_name]
            graph_ids = collection.distinct("graph_id")
            all_graph_ids.update(graph_ids)
        
        graphs = []
        
        for graph_id in all_graph_ids:
            # Count total nodes and edges across all collections for this graph
            total_nodes = 0
            total_edges = 0
            created_at = ""
            
            for collection_name in collection_names:
                collection = database[collection_name]
                docs = list(collection.find({"graph_id": graph_id}))
                
                if docs:
                    total_nodes += len(docs)
                    total_edges += sum(len(doc.get("d3_edges", [])) for doc in docs)
                    if not created_at:  # Get created_at from first document found
                        created_at = docs[0].get("created_at", "")
            
            if total_nodes > 0:  # Only add if we found actual data
                graphs.append(GraphMetadata(
                    id=graph_id,
                    name=f"Graph {graph_id[:8]}",
                    version="v1.0",
                    tags=["auto-generated"],
                    nodes=total_nodes,
                    edges=total_edges,
                    created_at=created_at,
                    updated_at=created_at
                ))
        
        client.close()
        return graphs
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving graphs: {str(e)}")

@app.get("/api/graphs/{graph_id}", response_model=ProcessedGraph)
async def get_graph(graph_id: str):
    try:
        client = get_mongodb_client()
        database = client["embedded_graph_2"]
        
        # Get all collections and find the graph
        node_map = {}
        links = []
        collection_names = database.list_collection_names()
        
        for collection_name in collection_names:
            collection = database[collection_name]
            cursor = collection.find({"graph_id": graph_id}, {'_id': 0, 'id': 1, 'd3_edges': 1, 'd3_target_nodes': 1, 'd3_source_node': 1, 'created_at': 1})
            
            for document in cursor:
                # Add source node
                source_node = document.get('d3_source_node')
                if source_node and source_node['id'] not in node_map:
                    node_map[source_node['id']] = source_node
                
                # Add target nodes
                target_nodes = document.get('d3_target_nodes', [])
                for target_node in target_nodes:
                    if target_node['id'] not in node_map:
                        node_map[target_node['id']] = target_node
                
                # Add links
                d3_edges = document.get('d3_edges', [])
                for link in d3_edges:
                    links.append(link)
        
        if not node_map:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Create metadata
        sample_doc = None
        for collection_name in collection_names:
            collection = database[collection_name]
            sample_doc = collection.find_one({"graph_id": graph_id})
            if sample_doc:
                break
        
        if not sample_doc:
            raise HTTPException(status_code=404, detail="Graph metadata not found")
        
        metadata = GraphMetadata(
            id=graph_id,
            name=f"Graph {graph_id[:8]}",
            version="v1.0",
            tags=["auto-generated"],
            nodes=len(node_map),
            edges=len(links),
            created_at=sample_doc.get("created_at", ""),
            updated_at=sample_doc.get("created_at", "")
        )
        
        graph_data = GraphData(
            nodes=list(node_map.values()),
            links=links
        )
        
        client.close()
        return ProcessedGraph(metadata=metadata, data=graph_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving graph: {str(e)}")

@app.delete("/api/graphs/{graph_id}")
async def delete_graph(graph_id: str):
    try:
        client = get_mongodb_client()
        database = client["embedded_graph_2"]
        
        # Delete from all collections
        collection_names = database.list_collection_names()
        deleted_count = 0
        
        for collection_name in collection_names:
            collection = database[collection_name]
            result = collection.delete_many({"graph_id": graph_id})
            deleted_count += result.deleted_count
        
        client.close()
        
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        return {"message": f"Graph {graph_id} deleted successfully", "deleted_documents": deleted_count}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting graph: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
