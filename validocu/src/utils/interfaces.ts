export interface Document {
    id: number;
    document_group_id: number;
    filename: string;
    filepath: string;
    mime_type: string;
    status: number;
    created_at: string;
    updated_at: string;
};

export interface DocumentGroup {
    id: number;
    name: string;
    status: number;
    created_at: string;
    updated_at: string;
    documents: Document[];
};
