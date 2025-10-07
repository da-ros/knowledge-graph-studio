from pymongo import MongoClient
import json, os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

node_map = {}  # To store unique nodes by ID
links = []

try:
    uri = os.getenv("MONGODB_URI")
    client = MongoClient(uri)
    database = client["embedded_graph_2"]
    
    # Get all collection names in the database
    collection_names = database.list_collection_names()
    print(f"Found collections: {collection_names}")
    
    for collection_name in collection_names:
        collection = database[collection_name]
        cursor = collection.find({}, {'_id': 0, 'id': 1, 'd3_edges': 1, 'd3_target_nodes': 1, 'd3_source_node': 1})
        
        for document in cursor:
            print(f"Processing document from {collection_name}: {document['id']}")
            
            # Add source node if not already added
            source_node = document.get('d3_source_node')
            if source_node and source_node['id'] not in node_map:
                node_map[source_node['id']] = source_node
            
            # Add target nodes if not already added
            target_nodes = document.get('d3_target_nodes', [])
            for target_node in target_nodes:
                if target_node['id'] not in node_map:
                    node_map[target_node['id']] = target_node
            
            # Add links
            d3_edges = document.get('d3_edges', [])
            for link in d3_edges:
                links.append(link)
                
except Exception as e:
    print(f"An error occurred: {e}")
finally:
    client.close()

# Convert node_map values to a list for the 'nodes' array
nodes = list(node_map.values())

# Prepare data for D3.js
graph_data = {
    "nodes": nodes,
    "links": links
}

# Write to JSON file
output_file = "python-dependencies_embedded_0.json"
with open(output_file, "w") as f:
    json.dump(graph_data, f, indent=2)

print(f"Graph data exported to {output_file}")
print(f"Total nodes: {len(nodes)}")
print(f"Total links: {len(links)}")