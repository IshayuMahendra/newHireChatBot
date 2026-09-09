import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from sentence_transformers import SentenceTransformer


class LocalEmbeddingFunction(EmbeddingFunction):
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def __call__(self, input: Documents) -> Embeddings:
        return self.model.encode(input).tolist()



chroma_client = chromadb.PersistentClient(
    path="./chroma_db"
)


embedding_function = LocalEmbeddingFunction()

# Create a collection
collection = chroma_client.get_or_create_collection(
    name="embedding_test",
    embedding_function=embedding_function,
)

# Add documents
collection.upsert(
    ids=["doc1", "doc2", "doc3"],
    documents=[
        "Employees can carry over unused PTO.",
        "Workers may save unused vacation time for next year.",
        "Employees must use a VPN when working remotely.",
    ],
)

#Ask a question
results = collection.query(
    query_texts=[
        "Can I save my vacation for next year?"
    ],
    n_results=2,
)

print("Retrieved documents:")
for document in results["documents"][0]:
    print("-", document)

print("\nIDs:")
print(results["ids"])

print("\nDistances:")
print(results["distances"])
