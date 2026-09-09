import re
from pathlib import Path
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

POLICY_DIR = Path(
    "C:\\Users\\labadmin\\Documents\\Capstone\\newHireChatBot\\pdf_policies"
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


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")


def main():
    pdf_files = list(POLICY_DIR.glob("*.pdf"))

    print(f"Found {len(pdf_files)} PDF files.")

    all_chunks = []

    for pdf_path in pdf_files:
        # Step 5: Extract
        raw_text = extract_text_from_pdf(pdf_path)

        # Step 6: Clean
        cleaned_text = clean_text(raw_text)

        # Chunk
        chunks = text_splitter.split_text(cleaned_text)

        print(f"\n--- {pdf_path.name} ---")
        print(f"Characters: {len(cleaned_text)}")
        print(f"Chunks: {len(chunks)}")

        # Attach metadata to every chunk
        for chunk_number, chunk_text in enumerate(chunks, start=1):
            chunk = {
                "id": f"{pdf_path.stem}_{chunk_number:04d}",
                "text": chunk_text,
                "metadata": {
                    "source": pdf_path.name,
                },
            }

            all_chunks.append(chunk)

    print(f"\nTotal chunks: {len(all_chunks)}")

    # Create an embedding for every chunk
    texts = [chunk["text"] for chunk in all_chunks]

    embeddings = embedding_model.encode(
        texts,
        show_progress_bar=True,
    )

    # Attach each embedding to its corresponding chunk
    for chunk, embedding in zip(all_chunks, embeddings):
        chunk["embedding"] = embedding.tolist()

    # Print a sample
    if all_chunks:
        print("\n--- SAMPLE CHUNK ---")
        print("ID:", all_chunks[0]["id"])
        print("Source:", all_chunks[0]["metadata"]["source"])
        print("Text:")
        print(all_chunks[0]["text"])

        print("\n--- SAMPLE EMBEDDING ---")
        print("Embedding dimensions:", len(all_chunks[0]["embedding"]))
        print("First 10 numbers:")
        print(all_chunks[0]["embedding"][:10])


if __name__ == "__main__":
    main()
