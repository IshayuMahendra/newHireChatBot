import chromadb

# Create a persistent Chroma database
chroma_client = chromadb.PersistentClient(
    path="./chroma_db"
)

# Create or retrieve a collection
collection = chroma_client.get_or_create_collection(
    name="test_collection"
)

# Add some test documents
collection.upsert(
    ids=["id1", "id2"],
    documents=[
        "This is a document about pineapple.",
        "This is a document about oranges.",
    ],
)

# Search the collection
results = collection.query(
    query_texts=["Tell me about tropical fruit."],
    n_results=2,
)

print(results)