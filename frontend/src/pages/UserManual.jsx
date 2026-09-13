import React from "react";
import StaticPage from "../components/StaticPage.jsx";

export default function UserManual() {
    return (
        <StaticPage
            title="User Manual"
            intro="Learn how to use MyEduPort with step-by-step instructions for dashboard setup, portfolio edits, and application planning."
            sections={[
                {
                    title: "Getting Started",
                    description: "Create an account, link your student profile, and begin tracking your application progress.",
                    items: [
                        "Register or sign in to MyEduPort",
                        "Complete your academic and extracurricular profile",
                        "Set goals and upload supporting documents"
                    ]
                },
                {
                    title: "Navigating the Platform",
                    description: "Use the menu and dashboard to access your portfolio, application timeline, and resources.",
                    items: [
                        "Dashboard summary and progress indicators",
                        "Portfolio section for academics, essays, and recommendations",
                        "Access resources and support tools from the menu"
                    ]
                }
            ]}
        />
    );
}
