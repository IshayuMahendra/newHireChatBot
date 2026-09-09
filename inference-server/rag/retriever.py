from pathlib import Path
import chromadb
from sentence_transformers import SentenceTransformer


CHROMA_DIR = Path(
    "C:\\Users\\labadmin\\Documents\\Capstone\\newHireChatBot\\chroma_db"
)


embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)


chroma_client = chromadb.PersistentClient(
    path=str(CHROMA_DIR)
)


collection = chroma_client.get_collection(
    name="policy_documents"
)


def retrieve(question: str, k: int = 3):
    """
    Convert the user's question into an embedding,
    search ChromaDB, and return the most relevant chunks.
    """

    query_embedding = embedding_model.encode(
        question
    ).tolist()

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        include=[
            "documents",
            "metadatas",
            "distances",
        ],
    )

    return results


if __name__ == "__main__":

    question = input(
        "Ask a policy question: "
    )

    results = retrieve(
        question,
        k=3,
    )

    print(
        "\n--- RETRIEVED CHUNKS ---"
    )

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    for i, (
        document,
        metadata,
        distance,
    ) in enumerate(
        zip(
            documents,
            metadatas,
            distances,
        ),
        start=1,
    ):

        print(
            f"\n--- RESULT {i} ---"
        )

        print(
            "Source:",
            metadata["source"],
        )

        print(
            "Chunk:",
            metadata.get(
                "chunk",
                "N/A",
            ),
        )

        print(
            "Distance:",
            distance,
        )

        print("Text:")

        print(document)