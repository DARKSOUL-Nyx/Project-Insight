import streamlit as st
import google.generativeai as palm

palm.configure(api_key="AIzaSyBeAw6OA3eKc5N85_LHgkDUBRUIns5iH6s")


model_name = "models/text-bison-001"

def generate_feedback(project_description, project_scenarios, project_code):
    prompt = (
    f"Please provide a comprehensive and well-organized feedback report for the following project details:\n\n"
    f"Project Description:\n{project_description}\n\n"
    f"Project Scenarios:\n{project_scenarios}\n\n"
    f"**Focus Areas (Optional):**\n"
    f"  - Code Documentation\n"
    f"  - Project Clarity\n"
    f"  - ... (Add more as needed)\n\n"
    f"**Examples of Strengths (Optional):**\n"
    f"  - Well-structured and easy-to-understand code\n"
    f"  - Clear and concise project goals\n"
    f"  - ... (Add more as needed)\n\n"
    f"**Examples of Improvement Areas (Optional):**\n"
    f"  - Potential code redundancy\n"
    f"  - Missing edge case handling in scenarios\n"
    f"  - ... (Add more as needed)\n\n"
    f"Use formal and professional language."
    )
    response = palm.generate_text(model=model_name, prompt=prompt)
    return response.result


def generate_cover_letter(company_name, job_title):
    prompt = (
        f"Please generate a professional and formal cover letter for the following job application:\n\n"
        f"Company Name: {company_name}\nJob Title: {job_title}\n\n"
        f"The cover letter should include:\n"
        f"1. An introduction mentioning the job position and interest in the company.\n"
        f"2. A brief overview of relevant skills and experiences.\n"
        f"3. A conclusion with a call to action and gratitude.\n"
        f"Use a formal and respectful tone."
    )
    response = palm.generate_text(model=model_name, prompt=prompt)
    return response.result
st.title("Project Insight: AI Feedback Generator for Development Teams")

st.markdown("""
Enter the details below to get AI-driven feedback on your project or to generate a cover letter.
""")

option = st.selectbox("Choose an Option", ["Generate Project Feedback", "Generate Cover Letter"])

if option == "Generate Project Feedback":
    st.subheader("Enter Project Details Below to Get AI-driven Feedback:")
    project_description = st.text_area("Project Description", height=150)
    project_scenarios = st.text_area("Project Scenarios", height=150)
    project_code = st.text_area("Project Code", height=150)
    
    if st.button("Get Feedback"):
        if project_description.strip() and project_scenarios.strip() and project_code.strip():
            with st.spinner("Generating Feedback..."):
                try:
                    feedback = generate_feedback(project_description, project_scenarios, project_code)
                    st.success("Here is Your AI-Driven Feedback!")
                    st.write(feedback)
                except Exception as e:
                    st.error(f"Error Generating Feedback: {e}")
        else:
            st.error("Please provide all project details.")
elif option == "Generate Cover Letter":
    st.subheader("Generate Cover Letter")
    company_name = st.text_input("Enter the Company Name")
    job_title = st.text_input("Enter the Job Title")
    
    if st.button("Generate"):
        if company_name.strip() and job_title.strip():
            with st.spinner("Generating Cover Letter..."):
                try:
                    cover_letter = generate_cover_letter(company_name, job_title)
                    st.success("Here is Your AI-Generated Cover Letter!")
                    st.write(cover_letter)
                except Exception as e:
                    st.error(f"Error Generating Cover Letter: {e}")
        else:
            st.warning("Please fill in all the fields.")
