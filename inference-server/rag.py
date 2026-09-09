def retrieve_policy_context_skeleton(state):
    rag_status = "skeleton"
    rag_confidence = 0.0
    rag_sources = []
    rag_chunks = []
    return {
        "rag_status": rag_status,
        "rag_confidence": rag_confidence,
        "rag_sources": rag_sources,
        "rag_chunks": rag_chunks
    }