import os
import json
import getpass

from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
from langchain_community.graphs.graph_document import GraphDocument, Node, Relationship
from pymongo import MongoClient
from pprint import pprint
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

def enhance_text_for_graph_extraction(original_text):
    """
    Enhance text to make relationships more explicit for graph extraction
    """
    llm = get_llm()
    
    enhancement_prompt = f"""
    You are an expert at analyzing text and making relationships between entities explicit for knowledge graph extraction.

    Given the following text, enhance it by:
    1. Making relationships between entities explicit and clear
    2. Connecting ALL entities mentioned in the text - no orphaned entities
    3. Using simple, direct relationship names
    4. Avoiding over-complication - keep it clean and focused
    5. Only create relationships that are clearly supported by the text
    6. Connect products to companies, locations to companies/people, events to relevant entities
    7. Connect competitors to the main company
    8. Connect locations to the main company (headquarters, operations)
    9. Connect business operations (stores, facilities) to the main company
    10. Use consistent entity naming (use underscores, not dots or spaces)
    11. Connect versions to their parent products/projects
    12. Connect features to their parent versions

    FOR PERSONAL NARRATIVES - CRITICAL:
    13. Identify the main person (narrator, subject of the story)
        - If the text uses "I", "me", "my" - use the entity name "I" or "Me"
        - If a person's name is mentioned (e.g., "John Smith"), use their actual name
        - Do NOT rename the person to "MAIN_PERSON" or generic terms
    14. Connect the main person to EVERY entity they interact with:
        - Universities they attended (STUDIED_AT)
        - Fields of study (STUDIED)
        - Companies they work for (WORKS_FOR)
        - Spouse/partner (MARRIED_TO)
        - Children (reverse of CHILD_OF or use PARENT_OF)
        - Places they lived (BORN_IN, MOVED_TO, LOCATED_IN)
        - Events they participated in (MET_AT, ATTENDED)
    15. Do NOT leave the main person disconnected from key entities
    16. Explicitly state: "I studied at University Y", "I works for Company Z", "I married Person Y"
        (Use the actual pronoun or name from the original text, not a generic placeholder)

    IMPORTANT: Use ONLY these simple relationship names:
    - FOUNDED_BY / FOUNDED
    - WORKS_FOR
    - INVESTED_IN
    - LOCATED_IN
    - CREATED_BY
    - PART_OF
    - RESPONSIBLE_FOR
    - EXPANDED_TO
    - DEVELOPED
    - COMPETES_WITH
    - HEADQUARTERED_IN
    - OPERATES_IN
    - VERSION_OF
    - FEATURE_OF
    - STUDIED_AT
    - STUDIED
    - MARRIED_TO
    - CHILD_OF / PARENT_OF
    - FAMILY_MEMBER
    - MET_AT (ONLY for personal encounters between people, e.g., "Person A met Person B at Event X")
    - ATTENDED (for people attending events)
    - BORN_IN (for people born in locations)
    - MOVED_TO (for people moving to locations)
    - RELEASED_ON (for software/products released on specific dates)
    - STARTED_ON (for projects/development that started on specific dates)
    - INSPIRED_BY (for software/projects inspired by other technologies)
    - SUCCESSOR_OF (for software versions that succeed previous versions)
    - INTERFACES_WITH (for software/projects that interface with other technologies)

    DO NOT create bidirectional relationships or multiple labels per edge.
    Ensure every entity mentioned has at least one connection.
    Use consistent naming: replace spaces and dots with underscores (e.g., "Python 2.0" becomes "Python_2_0").
    
    CRITICAL FOR PERSONAL STORIES: The main person MUST be directly connected to:
    - Their workplace
    - Their university
    - Their field of study
    - Their spouse/partner
    - Events they attended
    - All locations they lived in
    
    CRITICAL FOR TEMPORAL RELATIONSHIPS:
    - Use MET_AT ONLY for personal encounters (e.g., "Sarah met John at Tech Conference 2015")
    - Use RELEASED_ON for software versions and release dates (e.g., "Python 2.0 released on October 16, 2000")
    - Use STARTED_ON for project inception and start dates (e.g., "Python started on December 1989")
    - DO NOT use MET_AT for software releases, project starts, or other non-personal events
    
    CRITICAL FOR LOCATION RELATIONSHIPS:
    - Use LOCATED_IN ONLY for physical entities (people, companies, buildings, campuses)
    - Use HEADQUARTERED_IN for organizations and their headquarters
    - DO NOT use LOCATED_IN for abstract concepts (programming languages, software, operating systems)
    - Connect people to the organization where development happened, not the software to the location
    - Example: "Guido Van Rossum works for CWI" (organization), NOT "Python located in Netherlands"
    
    Pay special attention to connecting competitors, locations, business operations, version hierarchies, and personal relationships.
    Keep the enhanced text concise and focused on the main relationships.

    Original text:
    {original_text}

    Enhanced text (simplified and focused with all entities connected, especially the main person):
    """
    
    enhanced_text = llm.invoke(enhancement_prompt).content
    return enhanced_text

# Initialize LLM and transformer (will be created when needed)
llm = None
llm_transformer = None

def get_llm():
    """Get or create LLM instance"""
    global llm
    if llm is None:
        llm = ChatOpenAI(temperature=0, model_name="gpt-5-nano", api_key=os.getenv("OPENAI_API_KEY"))
    return llm

def get_llm_transformer():
    """Get or create LLM transformer instance"""
    global llm_transformer
    if llm_transformer is None:
        llm_transformer = LLMGraphTransformer(llm=get_llm())
    return llm_transformer

def simplify_relationships(relationships, max_relationships_per_node=10):
    """
    Simplify relationships by limiting the number per node and removing duplicates
    Increased limit to 10 to avoid cutting off important personal narrative connections
    """
    simplified = []
    node_relationship_count = {}
    seen_relationships = set()
    
    for rel in relationships:
        source_id = rel.source.id
        
        # Create a unique key for this relationship to avoid duplicates
        rel_key = (rel.source.id, rel.target.id, rel.type)
        
        # Skip if we've already seen this exact relationship
        if rel_key in seen_relationships:
            continue
        
        seen_relationships.add(rel_key)
        
        if source_id not in node_relationship_count:
            node_relationship_count[source_id] = 0
        
        # Only add if we haven't exceeded the limit for this node
        if node_relationship_count[source_id] < max_relationships_per_node:
            simplified.append(rel)
            node_relationship_count[source_id] += 1
    
    return simplified

def normalize_entity_names(nodes, relationships):
    """
    Normalize entity names to prevent duplicates (e.g., Python_2.0 vs Python_2_0)
    """
    import re
    
    # Create a mapping of normalized names to original names
    name_mapping = {}
    normalized_nodes = []
    
    for node in nodes:
        # Normalize the name: replace dots and spaces with underscores, convert to lowercase
        normalized_name = re.sub(r'[.\s]+', '_', node.id).lower()
        
        if normalized_name in name_mapping:
            # This is a duplicate, merge the nodes
            print(f"🔄 Merging duplicate entities: '{node.id}' → '{name_mapping[normalized_name]}'")
            continue
        else:
            name_mapping[normalized_name] = node.id
            normalized_nodes.append(node)
    
    # Update relationships to use normalized names
    normalized_relationships = []
    for rel in relationships:
        # Normalize source and target names
        source_normalized = re.sub(r'[.\s]+', '_', rel.source.id).lower()
        target_normalized = re.sub(r'[.\s]+', '_', rel.target.id).lower()
        
        # Find the corresponding normalized nodes
        source_node = next((n for n in normalized_nodes if re.sub(r'[.\s]+', '_', n.id).lower() == source_normalized), None)
        target_node = next((n for n in normalized_nodes if re.sub(r'[.\s]+', '_', n.id).lower() == target_normalized), None)
        
        if source_node and target_node:
            # Create new relationship with normalized nodes
            from langchain_community.graphs.graph_document import Relationship
            normalized_rel = Relationship(
                source=source_node,
                target=target_node,
                type=rel.type
            )
            normalized_relationships.append(normalized_rel)
    
    return normalized_nodes, normalized_relationships

def check_orphaned_entities(nodes, relationships):
    """
    Check for orphaned entities and suggest connections
    """
    connected_nodes = set()
    for rel in relationships:
        connected_nodes.add(rel.source.id)
        connected_nodes.add(rel.target.id)
    
    orphaned = []
    for node in nodes:
        if node.id not in connected_nodes:
            orphaned.append(node.id)
    
    if orphaned:
        print(f"⚠️  Orphaned entities found: {orphaned}")
        print("Consider adding relationships to connect these entities to the graph.")
        print(f"Connected nodes: {list(connected_nodes)}")
        print(f"All nodes: {[node.id for node in nodes]}")
    
    return orphaned

# Example usage (only runs when this file is executed directly)
if __name__ == "__main__":
    # Example text for testing
    text = """
    I was born in New York City in 1990. My family moved to California when I was 10. 
    I attended Stanford University and studied Computer Science. 
    I met Sarah at Tech Conference 2015. Sarah and I met at Tech Conference 2015.
    We got married in 2018 and now live in San Francisco. 
    I work at Google as a software engineer and have two children, Emma and Jake.
    Sarah works as a software engineer at Google. Emma and Jake are our children.
    """
    
    # Other texts for testing

    # Apple Inc. was founded in 1976 by Steve Jobs, Steve Wozniak, and Ronald Wayne in Cupertino, California.
    # The company is known for creating the iPhone, iPad, and Mac computers.
    # Tim Cook became CEO in 2011 after Steve Jobs passed away.
    # Apple has retail stores worldwide and is headquartered in Apple Park, a massive campus in Cupertino.
    # The company's main competitors include Microsoft, Google, and Samsung.

    # Our startup TechCorp was founded in 2020 by John Smith and Jane Doe. 
    # We raised $2M in Series A funding from Venture Capital Partners.
    # Our main product is an AI platform that helps businesses automate customer service.
    # We hired 50 employees and expanded to Europe in 2022.

    # I was born in New York City in 1990. My family moved to California when I was 10. 
    # I attended Stanford University and studied Computer Science. 
    # I met Sarah at Tech Conference 2015. Sarah and I met at Tech Conference 2015.
    # We got married in 2018 and now live in San Francisco. 
    # I work at Google as a software engineer and have two children, Emma and Jake.
    # Sarah works as a software engineer at Google. Emma and Jake are our children.

    # Python was invented in the late 1980s by Guido van Rossum at Centrum Wiskunde & Informatica in the Netherlands as a successor to the ABC 
    # programming language, which was inspired by SETL capable of exception handling and interfacing with the Amoeba operating system. 
    # Its implementation began in December 1989. Python 2.0 was released on 16 October 2000, with many major new features such as list comprehensions, 
    # cycle-detecting garbage collection, reference counting, and Unicode support. Python 3.0, released on 3 December 2008, 
    # with many of its major features backported to Python 2.6.x and 2.7.x. Releases of Python 3 include the 2to3 utility, 
    # which automates the translation of Python 2 code to Python 3.
    

    # Enhance the text to make relationships more explicit
    print("Enhancing text for better graph extraction...")
    enhanced_text = enhance_text_for_graph_extraction(text)
    print("Enhanced text:")
    print(enhanced_text)
    print("\n" + "="*50 + "\n")

    # Process the text
    documents = [Document(page_content=enhanced_text)]
    graph_documents = get_llm_transformer().convert_to_graph_documents(documents)

    # Apply simplification
    original_relationships = graph_documents[0].relationships
    simplified_relationships = simplify_relationships(original_relationships)

    # Normalize entity names to prevent duplicates
    print("Normalizing entity names to prevent duplicates...")
    normalized_nodes, normalized_relationships = normalize_entity_names(graph_documents[0].nodes, simplified_relationships)
    graph_documents[0].nodes = normalized_nodes
    graph_documents[0].relationships = normalized_relationships

    print(f"Nodes: {len(graph_documents[0].nodes)}")
    print(f"Original Relationships: {len(original_relationships)}")
    print(f"Simplified Relationships: {len(simplified_relationships)}")
    print(f"Normalized Relationships: {len(normalized_relationships)}")

    # Check for orphaned entities
    orphaned = check_orphaned_entities(graph_documents[0].nodes, normalized_relationships)

    print(f"Nodes: {graph_documents[0].nodes}")
    print(f"Relationships: {graph_documents[0].relationships}")

