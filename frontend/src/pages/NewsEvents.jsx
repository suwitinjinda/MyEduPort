import React from "react";
import StaticPage from "../components/StaticPage.jsx";

export default function NewsEvents() {
    return (
        <StaticPage
            title="News & Events"
            intro="Stay updated with the latest announcements, application deadlines, workshops, and community events for students and families."
            sections={[
                {
                    title: "Latest News",
                    description: "Important updates about application cycles, new features, and student success stories.",
                    items: [
                        "Platform updates and release notes",
                        "New guidance and admissions insights",
                        "Student achievement highlights"
                    ]
                },
                {
                    title: "Events",
                    description: "Upcoming webinars, workshops, and deadlines to help students stay on track.",
                    items: [
                        "Essay writing workshops",
                        "Admissions strategy webinars",
                        "Scholarship information sessions"
                    ]
                }
            ]}
        />
    );
}
