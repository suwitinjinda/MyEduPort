import React from "react";
import StaticPage from "../components/StaticPage.jsx";

export default function ApplicationProcess() {
    return (
        <StaticPage
            title="Application Process"
            intro="Plan every college application step with clear rounds, a strong college list, and milestone tracking to keep submissions on time."
            sections={[
                {
                    title: "Application Rounds",
                    description:
                        "Explore Early Decision, Early Action, Regular Decision, and Rolling Admission so you can choose the best approach for each school.",
                    items: [
                        "Early Decision: higher admission chance, binding commitment",
                        "Early Action: early decision window without binding agreement",
                        "Regular Decision: standard deadlines and review timeline",
                        "Rolling Admission: flexible deadlines with faster notification"
                    ]
                },
                {
                    title: "Building Your College List",
                    description:
                        "Create a balanced list of Reach, Target, and Safety schools based on your academic profile and interest areas.",
                    items: [
                        "Evaluate fit by major, campus culture, and outcomes",
                        "Track admission requirements per university",
                        "Assign Reach / Target / Safety categories",
                        "Update your list as test scores and profile evolve"
                    ]
                },
                {
                    title: "Application Timeline",
                    description:
                        "Stay on schedule with a timeline for tests, essays, recommendations, and final application submissions.",
                    items: [
                        "Test prep and registration dates",
                        "Essay planning and draft deadlines",
                        "Recommendation request calendar",
                        "Application submission reminders"
                    ]
                }
            ]}
        />
    );
}
