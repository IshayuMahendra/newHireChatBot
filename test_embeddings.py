from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

texts = [
    "Employees can carry over unused PTO.",
    "Workers may save unused vacation time for next year.",
    "The company requires employees to use a VPN when working remotely.",
]

embeddings = model.encode(texts)

# Compare the first sentence to the other sentences
similarities = np.dot(embeddings, embeddings.T)

print("Similarity matrix:")
print(similarities)
