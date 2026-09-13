import React from "react";
import StaticPage from "../components/StaticPage.jsx";

export default function AdmissionResources() {
    return (
        <StaticPage
            title="Admission Resources"
            intro="Access curated application support resources, university guides, scholarship tools, and study materials to strengthen your admissions strategy."
            sections={[
                {
                    title: "Articles",
                    description:
                        "Read expert guidance on applications, essay strategy, extracurricular planning, and profile building.",
                    items: [
                        "Personal statement tips and topic selection",
                        "How to demonstrate impact in activities",
                        "Guidance for first-generation and low-income applicants"
                    ]
                },
                {
                    title: "University",
                    description:
                        "Search university profiles, admission requirements, acceptance trends, and academic fit details.",
                    items: [
                        "School profiles for top US and global universities",
                        "Admissions statistics and competitiveness",
                        "Major-specific strength and fit analysis"
                    ]
                },
                {
                    title: "Scholarship",
                    description:
                        "Find scholarships, compare eligibility, and track application deadlines for financial support.",
                    items: [
                        "Need-based and merit-based scholarship resources",
                        "International student funding options",
                        "Application checklist and document requirements"
                    ]
                },
                {
                    title: "Practice Tests",
                    description:
                        "Prepare for standardized exams with practice material, score goals, and test strategy support.",
                    items: [
                        "SAT / ACT practice and score tracking",
                        "TOEFL / IELTS preparation for international students",
                        "AP exam and subject test review plans"
                    ]
                },
                {
                    title: "eBook & Guides",
                    description:
                        "Download guides and eBooks for step-by-step application planning and portfolio development.",
                    items: [
                        "College application roadmap",
                        "Essay writing workbook",
                        "Portfolio planning checklist"
                    ]
                }
            ]}
        />
    );
}
