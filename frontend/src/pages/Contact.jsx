import React from "react";
import StaticPage from "../components/StaticPage.jsx";

export default function Contact() {
    return (
        <StaticPage
            title="Contact Us"
            intro="Need help or have questions? Reach out to our support team for assistance with admissions planning, account setup, or feature feedback."
            sections={[
                {
                    title: "Support",
                    description:
                        "Contact our support team for technical help, account questions, and guidance on using MyEduPort.",
                    items: [
                        "Email: support@myeduport.ai",
                        "Response time: typically within 24 hours",
                        "Live chat support available during business hours"
                    ]
                },
                {
                    title: "Feedback",
                    description:
                        "Share ideas for new features, improvements, or content you would like to see in the platform.",
                    items: [
                        "Submit product feedback through the app",
                        "Request new university or scholarship resources",
                        "Suggest improvements for your application workflow"
                    ]
                }
            ]}
        />
    );
}
