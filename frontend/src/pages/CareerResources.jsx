import React from "react";
import StaticPage from "../components/StaticPage.jsx";

export default function CareerResources() {
    return (
        <StaticPage
            title="Career Resources"
            intro="Explore career planning tools, internship guidance, and pathways that connect your extracurriculars to future success."
            sections={[
                {
                    title: "Articles",
                    description: "Read career pathway guidance, personal branding tips, and planning advice for competitive fields.",
                    items: [
                        "High school to career mapping",
                        "How extracurriculars translate into career growth",
                        "Advice for STEM, humanities, and arts pathways"
                    ]
                },
                {
                    title: "Career Path Planning",
                    description:
                        "Identify potential fields of study and career opportunities aligned with your interests and strengths.",
                    items: [
                        "Major selection and career outcome comparisons",
                        "Exploring internships and research experiences",
                        "Building a long-term academic and professional roadmap"
                    ]
                },
                {
                    title: "Experience & Skills",
                    description:
                        "Track work experience, leadership roles, and skill development that strengthen both applications and career readiness.",
                    items: [
                        "Resume-building strategies for students",
                        "Internships, competitions, and work experience planning",
                        "Skill-based certifications and online learning resources"
                    ]
                }
            ]}
        />
    );
}
