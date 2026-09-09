from app.schemas.onboarding import AskModel
from app.services.workflows import invoke_AskWorkflow


def main():
    print("\n==============================")
    print("TESTING ASK WORKFLOW WITH RAG")
    print("==============================")

    # Use a question whose answer you KNOW exists
    
    test_request = AskModel(
        role="Software Engineer",
        department="Engineering",
        user_prompt="What is the open enrollment window for new hires?",
        onboarding_day=1,
        current_tasks=[],
        current_plan={},
    )

    print("\n--- TEST INPUT ---")
    print("Role:", test_request.role)
    print("Department:", test_request.department)
    print("Question:", test_request.user_prompt)

    # Run the complete LangGraph workflow
    result = invoke_AskWorkflow(test_request)

    print("\n==============================")
    print("WORKFLOW RESULT")
    print("==============================")

    # 1. Check whether retrieval ran
    print("\n--- RAG STATUS ---")
    print(result.get("rag_status"))

    # 2. Check which sources were retrieved
    print("\n--- RAG SOURCES ---")

    sources = result.get("rag_sources", [])

    if sources:
        for i, source in enumerate(sources, start=1):
            print(f"{i}. {source}")
    else:
        print("No sources returned.")

    # 3. Check the actual text retrieved from Chroma
    print("\n--- RAG CHUNKS ---")

    chunks = result.get("rag_chunks", [])

    if chunks:
        for i, chunk in enumerate(chunks, start=1):
            print(f"\nCHUNK {i}")
            print("-" * 40)
            print(chunk)
    else:
        print("No chunks returned.")

    # 4. Check the final LLM response
    print("\n==============================")
    print("FINAL LLM RESPONSE")
    print("==============================")

    print(result.get("response"))

    print("\n==============================")
    print("TEST COMPLETE")
    print("==============================")


if __name__ == "__main__":
    main()