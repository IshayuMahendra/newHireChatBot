import re
from pathlib import Path

import chromadb

from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer


REPO_ROOT = Path(__file__).resolve().parents[2]

POLICY_DIR = Path(
    REPO_ROOT / "pdf_policies"
)

CHROMA_DIR = Path(
    REPO_ROOT / "chroma_db"
)


def extract_text_from_pdf(pdf_path: Path) -> str:
    """Extract all text from a PDF."""
    reader = PdfReader(pdf_path)

    pages = []

    for page in reader.pages:
        text = page.extract_text()

        if text:
            pages.append(text)

    return "\n".join(pages)


def clean_text(text: str) -> str:
    """Clean common PDF formatting artifacts."""

    text = text.replace("\r\n", "\n")

    text = re.sub(r"[ \t]+", " ", text)

    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# Split large document text into smaller overlapping chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)


# Local embedding model
embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)


def main():
    
    # Find PDF files
    

    pdf_files = list(
        POLICY_DIR.glob("*.pdf")
    )

    print(
        f"Found {len(pdf_files)} PDF files."
    )

    if not pdf_files:
        raise FileNotFoundError(
            f"No PDF files found in {POLICY_DIR}. "
            "Update POLICY_DIR or add policy PDFs before running ingest."
        )

    all_chunks = []

    
    
    

    for pdf_path in pdf_files:

        # Extract PDF text
        raw_text = extract_text_from_pdf(
            pdf_path
        )

        # Clean extracted text
        cleaned_text = clean_text(
            raw_text
        )

        # Split text into chunks
        chunks = text_splitter.split_text(
            cleaned_text
        )

        print(
            f"\n--- {pdf_path.name} ---"
        )

        print(
            f"Characters: {len(cleaned_text)}"
        )

        print(
            f"Chunks: {len(chunks)}"
        )

        #Attach metadata to each chunk
       

        for chunk_number, chunk_text in enumerate(
            chunks,
            start=1,
        ):

            chunk = {
                "id": (
                    f"{pdf_path.stem}_"
                    f"{chunk_number:04d}"
                ),

                "text": chunk_text,

                "metadata": {
                    "source": pdf_path.name,
                    "chunk": chunk_number,
                },
            }

            all_chunks.append(
                chunk
            )

    print(
        f"\nTotal chunks: {len(all_chunks)}"
    )

    if not all_chunks:
        raise ValueError(
            "No text chunks were created from the policy PDFs. "
            "Check that the files contain extractable text."
        )

    
    #Create embeddings
    

    texts = [
        chunk["text"]
        for chunk in all_chunks
    ]

    embeddings = embedding_model.encode(
        texts,
        show_progress_bar=True,
    )

    
    #Attach embedding to each chunk
    

    for chunk, embedding in zip(
        all_chunks,
        embeddings,
    ):
        chunk["embedding"] = (
            embedding.tolist()
        )

    
    
    # Create persistent Chroma client


    chroma_client = (
        chromadb.PersistentClient(
            path=str(CHROMA_DIR)
        )
    )


    #Create or load collection
    

    collection = (
        chroma_client
        .get_or_create_collection(
            name="policy_documents"
        )
    )

    #data for Chroma
    

    ids = [
        chunk["id"]
        for chunk in all_chunks
    ]

    documents = [
        chunk["text"]
        for chunk in all_chunks
    ]

    metadatas = [
        chunk["metadata"]
        for chunk in all_chunks
    ]

    embeddings_to_store = [
        chunk["embedding"]
        for chunk in all_chunks
    ]

    
    #Storing everything in ChromaDB
    

    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
        embeddings=embeddings_to_store,
    )

    print(
        f"\nStored {len(all_chunks)} "
        "chunks in ChromaDB."
    )

    
    #Chroma verification
    

    print("\n--- CHROMA VERIFICATION ---")

    stored_count = collection.count()

    print("Stored records:", stored_count)

    sample = collection.get(
        limit=3,
        include=[
            "documents",
            "metadatas",
        ],
    )

    for i in range(len(sample["ids"])):
        print(f"\n--- RECORD {i + 1} ---")
        print("ID:", sample["ids"][i])
        print("Metadata:", sample["metadatas"][i])
        print("Text:")
        print(sample["documents"][i][:500])

    
    #Print sample chunk
    

    if all_chunks:

        print(
            "\n--- SAMPLE CHUNK ---"
        )

        print(
            "ID:",
            all_chunks[0]["id"],
        )

        print(
            "Source:",
            all_chunks[0][
                "metadata"
            ]["source"],
        )

        print(
            "Chunk number:",
            all_chunks[0][
                "metadata"
            ]["chunk"],
        )

        print("Text:")

        print(
            all_chunks[0]["text"]
        )

        
        #Print sample embedding
        

        print(
            "\n--- SAMPLE EMBEDDING ---"
        )

        print(
            "Embedding dimensions:",
            len(
                all_chunks[0][
                    "embedding"
                ]
            ),
        )

        print(
            "First 10 numbers:"
        )

        print(
            all_chunks[0][
                "embedding"
            ][:10]
        )


if __name__ == "__main__":
    main()