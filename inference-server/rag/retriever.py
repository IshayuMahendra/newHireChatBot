from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer


REPO_ROOT = Path(__file__).resolve().parents[2]

CHROMA_DIR = REPO_ROOT / "chroma_db"


embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)


chroma_client = chromadb.PersistentClient(
    path=str(CHROMA_DIR)
)


collection = chroma_client.get_collection(
    name="policy_documents"
)


# Lower distance = more similar.
#
# Based on testing:
# "when is open enrollment" -> best distance around 0.886
# "create a task to meet my manager" -> best distance around 1.256
#
# So 1.0 is a reasonable starting threshold for this dataset.
MAX_DISTANCE = 1.0


def retrieve(
    question: str,
    k: int = 3,
    max_distance: float = MAX_DISTANCE,
):
    """
    Convert the user's question into an embedding,
    search ChromaDB, and return only policy chunks
    whose distance is close enough to the question.

    Lower distance means a stronger semantic match.
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

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    filtered_documents = []
    filtered_metadatas = []
    filtered_distances = []

    for document, metadata, distance in zip(
        documents,
        metadatas,
        distances,
    ):
        if distance <= max_distance:
            filtered_documents.append(
                document
            )

            filtered_metadatas.append(
                metadata
            )

            filtered_distances.append(
                distance
            )

    return {
        "documents": [
            filtered_documents
        ],
        "metadatas": [
            filtered_metadatas
        ],
        "distances": [
            filtered_distances
        ],
    }


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

    documents = results[
        "documents"
    ][0]

    metadatas = results[
        "metadatas"
    ][0]

    distances = results[
        "distances"
    ][0]

    if not documents:
        print(
            "\nNo sufficiently relevant "
            "policy chunks were found."
        )

    else:

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
                metadata.get(
                    "source",
                    "Unknown source",
                ),
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
                round(
                    distance,
                    4,
                ),
            )

            print(
                "Text:"
            )

            print(
                document
            )