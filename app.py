import streamlit as st
from ollama import chat


st.set_page_config(
    page_title="Sovereign AI Workbench",
    page_icon="🔒",
    layout="wide"
)



if "messages" not in st.session_state:
    st.session_state.messages = []

with st.sidebar:
    st.title("🔒 Sovereign AI")

    st.markdown("### Local Model")

    model = st.text_input(
        "Ollama Model",
        value="qwen2.5:3b"
    )

    st.divider()

    st.markdown("### Security")

    st.success("🟢 Local inference")

    st.info("No cloud AI API")

    st.info("Ollama backend")



st.title("🔒 Sovereign AI Workbench")

st.caption(
    "Private AI assistant running entirely on your local machine"
)



for message in st.session_state.messages:

    with st.chat_message(message["role"]):
        st.markdown(message["content"])



prompt = st.chat_input(
    "Ask your local AI assistant..."
)


if prompt:

    st.session_state.messages.append({
        "role": "user",
        "content": prompt
    })

    with st.chat_message("user"):
        st.markdown(prompt)

    messages = [
        {
            "role": message["role"],
            "content": message["content"]
        }
        for message in st.session_state.messages
    ]

    # Generate response
    with st.chat_message("assistant"):

        response_placeholder = st.empty()

        full_response = ""

        try:

            stream = chat(
                model=model,
                messages=messages,
                stream=True
            )

            for chunk in stream:

                text = chunk["message"]["content"]

                full_response += text

                response_placeholder.markdown(
                    full_response + "▌"
                )

            response_placeholder.markdown(
                full_response
            )

            # Save assistant response
            st.session_state.messages.append({
                "role": "assistant",
                "content": full_response
            })

        except Exception as e:

            st.error(
                f"Error connecting to Ollama:\n\n{e}"
            )
