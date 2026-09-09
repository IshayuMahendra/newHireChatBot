import chromadb

chroma_client = chromadb.PersistentClient(
    path="./chroma_db"
)

collection = chroma_client.get_collection(
    name="test_collection"
)

print("Collection:", collection.name)
print("Number of documents:", collection.count())
