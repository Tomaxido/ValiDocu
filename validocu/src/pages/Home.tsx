import { useEffect, useState } from "react";
import { getDocumentGroups } from "../utils/api";
import type { DocumentGroup } from "../utils/interfaces";
import type { JSX } from "@emotion/react/jsx-runtime";

export default function Home(): JSX.Element {
	const [documentGroups, setDocumentGroups] = useState<DocumentGroup[] | null>(null);

	useEffect(() => {
		const fun = async () => {
			setDocumentGroups(await getDocumentGroups());
		};
		fun();
	}, []);

	if (documentGroups === null) {
		return <p>Cargando...</p>;
	}

	return (
		<>
			{documentGroups.map(group => (
				<article key={group.id}>
					<h3>{group.id}. {group.name}</h3>
					<ul>
						{group.documents.map(document => (
							<li key={document.id}>
								<a href={document.filename}>
									{document.filename}
								</a>
							</li>
						))}
					</ul>
				</article>
			))}
		</>
	);
}