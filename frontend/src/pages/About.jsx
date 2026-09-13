import React from "react";
import StaticPage from "../components/StaticPage.jsx";

export default function About() {
    return (
        <StaticPage
            title="About Us"
            intro="MyEduPort is designed to help students build strong, holistic portfolios for university applications through AI guidance and clear, actionable planning."
            sections={[
                {
                    title: "Our Mission",
                    description:
                        "We help students capture academic achievements, extracurricular impact, essays, recommendations, and application timelines in one central platform.",
                    items: [
                        "Support top-tier university application planning",
                        "Provide clear progress tracking and guidance",
                        "Empower students, parents, and counselors with actionable insights"]
                },
                {
                    title: "What We Offer",
                    description:
                        "From portfolio planning to admission resources, our platform is built to support every stage of the application journey.",
                    items: [
                        "Dashboard and portfolio progress tracking",
                        "Application process planning tools",
                        "University and scholarship resources"]
                }
            ]}
        />
    );
}
