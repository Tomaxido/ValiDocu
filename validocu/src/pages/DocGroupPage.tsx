import type { JSX } from "@emotion/react/jsx-runtime";

interface DocGroupPageProps {
    groupID: number;
}

export default function DocGroupPage({ groupID }: DocGroupPageProps): JSX.Element {
    console.log(groupID);
    return <></>;
} 