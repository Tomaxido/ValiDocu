--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18
-- Dumped by pg_dump version 14.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cache; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cache (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    expiration integer NOT NULL
);


ALTER TABLE public.cache OWNER TO postgres;

--
-- Name: cache_locks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cache_locks (
    key character varying(255) NOT NULL,
    owner character varying(255) NOT NULL,
    expiration integer NOT NULL
);


ALTER TABLE public.cache_locks OWNER TO postgres;

--
-- Name: document_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_groups (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    status integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.document_groups OWNER TO postgres;

--
-- Name: document_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.document_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.document_groups_id_seq OWNER TO postgres;

--
-- Name: document_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.document_groups_id_seq OWNED BY public.document_groups.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id bigint NOT NULL,
    document_group_id bigint NOT NULL,
    filename character varying(255) NOT NULL,
    filepath character varying(255) NOT NULL,
    mime_type character varying(255),
    status integer DEFAULT 0 NOT NULL,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.documents_id_seq OWNER TO postgres;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: failed_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.failed_jobs (
    id bigint NOT NULL,
    uuid character varying(255) NOT NULL,
    connection text NOT NULL,
    queue text NOT NULL,
    payload text NOT NULL,
    exception text NOT NULL,
    failed_at timestamp(0) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.failed_jobs OWNER TO postgres;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.failed_jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.failed_jobs_id_seq OWNER TO postgres;

--
-- Name: failed_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.failed_jobs_id_seq OWNED BY public.failed_jobs.id;


--
-- Name: job_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_batches (
    id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    total_jobs integer NOT NULL,
    pending_jobs integer NOT NULL,
    failed_jobs integer NOT NULL,
    failed_job_ids text NOT NULL,
    options text,
    cancelled_at integer,
    created_at integer NOT NULL,
    finished_at integer
);


ALTER TABLE public.job_batches OWNER TO postgres;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id bigint NOT NULL,
    queue character varying(255) NOT NULL,
    payload text NOT NULL,
    attempts smallint NOT NULL,
    reserved_at integer,
    available_at integer NOT NULL,
    created_at integer NOT NULL
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jobs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.jobs_id_seq OWNER TO postgres;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    migration character varying(255) NOT NULL,
    batch integer NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    email character varying(255) NOT NULL,
    token character varying(255) NOT NULL,
    created_at timestamp(0) without time zone
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id character varying(255) NOT NULL,
    user_id bigint,
    ip_address character varying(45),
    user_agent text,
    payload text NOT NULL,
    last_activity integer NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    email_verified_at timestamp(0) without time zone,
    password character varying(255) NOT NULL,
    remember_token character varying(100),
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: document_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_groups ALTER COLUMN id SET DEFAULT nextval('public.document_groups_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: failed_jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failed_jobs ALTER COLUMN id SET DEFAULT nextval('public.failed_jobs_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: cache; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cache (key, value, expiration) FROM stdin;
\.


--
-- Data for Name: cache_locks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cache_locks (key, owner, expiration) FROM stdin;
\.


--
-- Data for Name: document_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_groups (id, name, status, created_at, updated_at) FROM stdin;
1	tarea 3 vd	0	2025-06-06 02:13:18	2025-06-06 02:13:18
3	word	0	2025-06-06 02:13:34	2025-06-06 02:13:34
4	test api	0	2025-06-06 02:49:55	2025-06-06 02:49:55
5	test api	0	2025-06-06 02:52:16	2025-06-06 02:52:16
7	test	0	2025-06-09 01:40:39	2025-06-09 01:40:39
8	test	0	2025-06-09 01:41:05	2025-06-09 01:41:05
9	aa	0	2025-06-09 01:41:35	2025-06-09 01:41:35
10	ab	0	2025-06-09 01:42:01	2025-06-09 01:42:01
11	aaaa	0	2025-06-09 02:38:48	2025-06-09 02:38:48
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, document_group_id, filename, filepath, mime_type, status, created_at, updated_at) FROM stdin;
1	1	Tarea_3.pdf	documents/AWvpWEHpAm4IcP7Rxp9Mu0nn5YTQKQ6bkWmIztI9.pdf	application/pdf	0	2025-06-06 02:13:18	2025-06-06 02:13:18
5	3	Trabajo Previo.docx	documents/BFGqlLXlPbB8L1I3WyhWBsklbvZq7c0ZAjO89ZNe.docx	application/vnd.openxmlformats-officedocument.wordprocessingml.document	0	2025-06-06 02:13:34	2025-06-06 02:13:34
6	4	Captura de pantalla 2024-12-03 213518.png	documents/U35PE4nXkS3zXPWWnHvzvftsPByNnAkcpfeA6Y2X.png	image/png	0	2025-06-06 02:49:55	2025-06-06 02:49:55
7	4	Captura de pantalla 2024-12-20 233936.png	documents/34qh0MbOnYYMmPeQUrDW3v8maHK4rCPWbbBsOBtL.png	image/png	0	2025-06-06 02:49:55	2025-06-06 02:49:55
8	5	Captura de pantalla 2024-12-05 115126.png	documents/30t2NSCLD0FdpQwHC9aP5wxjqJIrI83tHtjwlxgk.png	image/png	0	2025-06-06 02:52:16	2025-06-06 02:52:16
9	5	Captura de pantalla 2024-12-16 224613.png	documents/9apSVsd2MhFNEaYMWM6gHt5HT7zJBFA1Hg9CDHZU.png	image/png	0	2025-06-06 02:52:16	2025-06-06 02:52:16
12	1	3.1c Visualización de Tablas de Números (Tableau).pdf	documents/xb8PmmI7yHzDfGtZvxeeLoyLSUJTGVNyOEbaqmBK.pdf	application/pdf	1	2025-06-09 00:15:22	2025-06-09 00:15:22
14	1	3.1a Visualización de Tablas de Números (Flourish).pdf	documents/ICmHBvnSxpvlhmr5Y43xs96B6DtMcOPKFBj8iS81.pdf	application/pdf	2	2025-06-09 00:15:35	2025-06-09 00:15:35
16	7	ValiDocu.png	documents/HwcCVKYO0rJzV5Fnw5NFeSEK0FIOBE6Ck91Zt79g.png	image/png	0	2025-06-09 01:40:39	2025-06-09 01:40:39
17	7	ValiDocu_1.png	documents/FlWSaaZZHxcg0d1dhYZK6Rg0CDGtqEFtw49cweU1.png	image/png	0	2025-06-09 01:40:39	2025-06-09 01:40:39
18	8	ValiDocu_1.png	documents/k6CtW6REFUe8yVDFBwIZwB6KH2V0wHEunwikGmFH.png	image/png	0	2025-06-09 01:41:05	2025-06-09 01:41:05
19	9	ValiDocu_1.png	documents/hDphgJrn8LqXuOHFEgiYlyznw0FKFSPoCyAm0Zwj.png	image/png	0	2025-06-09 01:41:35	2025-06-09 01:41:35
20	9	ValiDocu_1.png	documents/GniIweqxJYil9KVmo3BHwPqL4Eae4ItgULaFGgaI.png	image/png	0	2025-06-09 01:41:35	2025-06-09 01:41:35
21	9	ValiDocu_1.png	documents/75eRy6gCtbcflFFCkAW2TIPV2E9njzLH2oBlRyJx.png	image/png	0	2025-06-09 01:41:35	2025-06-09 01:41:35
22	10	ValiDocu_1.png	documents/NvLNmOPXTd00lDqjaa9jHnuim49a12W8DS9u73OO.png	image/png	0	2025-06-09 01:42:01	2025-06-09 01:42:01
23	10	ValiDocu_1.png	documents/fVnkovdVzEmBsbyashOuoZcTZy9ILfKHk9JXPRKV.png	image/png	0	2025-06-09 01:42:01	2025-06-09 01:42:01
24	10	ValiDocu.png	documents/YG7gKrylDVKLtogZUxNfvqMr03tzhfDbdY3hXQun.png	image/png	0	2025-06-09 01:42:01	2025-06-09 01:42:01
25	1	3.1b Visualización de Tablas de Números (Flourish).pdf	documents/tTMLBRxg4ZK3GBuYwHtCzvjHz4ybw1ton6lLm81I.pdf	application/pdf	0	2025-06-09 02:10:49	2025-06-09 02:10:49
27	11	ValiDocu_1.png	documents/VylCAb51G7v9AppDBxPwZcfIrFw2symLjWXmZojJ.png	image/png	0	2025-06-09 02:38:48	2025-06-09 02:38:48
28	11	ValiDocu_1.png	documents/dggbzxW0ZOvrFrIBpQWOx7r05SNdqG5t1uxtV9lb.png	image/png	0	2025-06-09 02:38:48	2025-06-09 02:38:48
29	11	pdf_paginas (1).zip	documents/GWafClsmux19JHehbIqYpKBEbSEfBhPkFL8YF4xF.zip	application/x-zip-compressed	0	2025-06-09 02:38:48	2025-06-09 02:38:48
\.


--
-- Data for Name: failed_jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.failed_jobs (id, uuid, connection, queue, payload, exception, failed_at) FROM stdin;
\.


--
-- Data for Name: job_batches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.job_batches (id, name, total_jobs, pending_jobs, failed_jobs, failed_job_ids, options, cancelled_at, created_at, finished_at) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jobs (id, queue, payload, attempts, reserved_at, available_at, created_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, migration, batch) FROM stdin;
1	0001_01_01_000000_create_users_table	1
2	0001_01_01_000001_create_cache_table	1
3	0001_01_01_000002_create_jobs_table	1
4	2025_06_06_005740_create_document_groups_table	1
5	2025_06_06_005746_create_documents_table	1
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (email, token, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, ip_address, user_agent, payload, last_activity) FROM stdin;
N2VA0Emt0qGg6F9f4eXhscll7xNZK8vJD2tC93ml	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiSlFSdWZMTWdheHlGYTlvUjNGcWdtTkVyQmVObHV2b3FQNFZlUFhzZCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428123
oJ6ZlIHdOrqCy8fJKDmkmIOcSnRHYGc3PXr6P5hj	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiMmx3YklCS05jQ0xLTlpWaUJFdlR2cEJpT0VUMVZvbk8xWVJhMFMwZyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428125
R5Z4nAnjAvxK2goSj1pQ5r5KxV4CbDz6XISYaZEq	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiZXFIemVpUHlUMWFxdmNKVHFvYkZ0T29kSHJ1TnNRN1Z1N0VuUUpNeiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428127
v4RRfdS7Yys1KhzwVCOTHdaxd86YtYwY0vfnHAfx	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiV1IxaHhXYzZ3WHd6MjFRVkpwb1B2dVVsQVJGZEpzeG1SRkx4OWZldSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428136
TcJEu0wuB0JSQeZVJyCnwWkS6mOHs9IoGQX4Bcgs	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiMDVvMlkzOWkzYkNqQkczaWNsNDVOZE5wRnYzOW9XVkQ2YmdmNElkNCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428140
nUa1ON2cyLUIUcdklu6AzCbVB3gb81xbtyrePMEV	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiZ1EzVUdYanFoYnhYRlMzS0MybjFyTlRjc2VMSWc5MjRGZjNkWmNwcCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428140
9FZq1hYSYMO3xyfPuygmLwDxu5duqHeP8AvjNJJq	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoicTVTaHVmT0V3RkpZb3BTVUdZeEh5eFNwU0NsWDlZS2ZuYTRleUhWdSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428142
oszLgLyAFeQzpdCdSTvBMm3HMMBX0UbEVBtbSczm	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiQTB4S3pxc1NIZG5PV1V0UGRNSXFuaTVsdFV3V2pISjNYUmRsdDdJbyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428143
kJG2XvBWwFwMpZgFQgCaP1nkzQTvrthkp7jKk3Mo	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoibUJ3THJDYWdXeFBtWmNCS2lob0pBb1Z6NmtkSHk5dW5PYmlCb2xnbSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428143
untJEqreFnYgCCJlgCZUCjQdL9d0tZ0ak98mxCyo	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoibFZxVjI2TEJhdm93YlVSM25hNmY4dlo0MXh3ZTVXVWxlaWpZOG9hZyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428144
YAAB4GK4rP1ysOdHlQRDF0ld8dsZQ0nk3ySnOuWC	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiVDdKZ3E2N0xFVkliYXdyelh1aWhvRnd5b0hZQXdSanVOdFdWcXAzYSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428145
juMVzWMQbUMbWE7C5cXqyH2zVnCT2q1hZpyxmUjG	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiZFpUWDdsUEtsVEpkNzZTZnU1aDF0RlJUMVM3RHdvWHlZZ0Z2akNEQyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428145
lb8UhMTeUrB27RPxKeWbPepE1EYBXI9r49CzWLMU	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoib1JiN2gxelVxdWhKM09ueDRhbmN1djJHM1RwcDFlRHZhSUJrQjlpTiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428146
H3mcy4JjsSRdEMijlWpOOD0G3vKM5ujGohZwfY9Y	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoic3B5bzExcGU0eHdrU1I4SjRFZ3p1cEVRRmRuY2ZPYVJLTnJ1cHlTOSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428147
pDmrKNIj5EzyTKRKcVRZU9xJeXwlRMv3Dul2wU7o	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiSTJxV0FjMkhLc0xrWmZmR2VMbEQ2akQya2xkQWlRV2VMZjVoendzbyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428148
cLS91rro6cKBEfCtUvJLwyaKMUv1N4WIDyIIm5gt	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiakg5c0N1WWo3ZW12V3I1bWNtRW5uQnFOdmFZbzB4ZHFvSml0Q1BnUyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428251
9WKcpH6fEsL4rDDroc09p238MkakNS7Ku0reFWfW	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiZk5mMzVZRlhQMUhqRVdoRXd3RU1aR0tIaUZLV1FGNm5IZm5KTkEyMSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428251
pkps7F1KGRvBo9zFhm9KSggLutgvpeJr2S2SgW3l	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoidDlKSTNOMjJ1U2NwMkxuVk9RMmNrVW1ranF5eFdPRVZWc2lyNlEwWiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428252
l96DHsKCGCARiDfI8GDIfuyf286sdSt4vBVE8WuP	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoidjdYb2F0c1A1cVYxNDdTMFE1UFd1MW1IUkF4UVRPZ2tVeFB3RzVzQSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428282
bKyVZIuLfDK9tBKy25HfcekxblGzRvrrRy69jHdP	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiOU5USk56TDFPaGEwSTA2YVJTREFydEJ2SlIxT3ROWXNHUU9adWZUMiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428283
kOjJo61xCKTeR1rzAQAv3AADGcc7UM4EEdj4DTRX	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiMXNrbEc2U3ZQTFlYWnAxaXJOMUJWSWQ2TExETVNNQkdvTzdORkRRNiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428283
zJlCxyxJqtkcWGI8LpdV5CgwxO3PJptke3ghQ34b	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiQUZxWkJRbkxuOGxaQTFaTGpwTFBoRTl4aEUwdWhRcWJXZDZPOXFlWCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428523
obipGKE52C6k5HlET9W4NXYs86yzIxz0Hb5Uevjq	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiVUU3SzlWMUtPckhOZ2VIUFNrVm5sOG12bGlFTjE0TGlHelVoMEJzNyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428523
YbkYsWeZxhUpE1IgpMCQPuA9vqfkmOJdyw6O1FYE	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiTVc0eU1TQlJqdkhHc2hrTzV2VzE0YmNnWGJUT2hHYTVOVXNpY1pHNyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428524
CNQGbEtubmjrVxS9GuF2exWStXIGuEhVE96TbChj	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoibktWV290WndxSG1FejVVTFNWNU9VblhjMWZodHE4TmpXTXJ5UVVEUyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428630
MFUlcjsUvo7rFslqDnZbniIybPZU46kFFYI6ZY52	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiYlByZTdPeUZMbk9PSFIwbHd4eGJvRVN6SU5KSDh3TTFXVGRtN281MCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428630
um8AhPsLX4O2GgQjKPK7E0O0D3NhfTv9TAk9xAFN	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoidFFNeTluTThOdzZZMnlDTEhibE0zWXNFVTNGTzloUGpTTWVNWmFiRCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428631
BPT1FvPBdTvGotcnZCiF9lgLuscNpWwzMLQklFw1	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiQ0J1Y1V3R3AxSFhGVkJaSk5xaThJbVk3TnJyS2xNc3RHbVhIYVJ3ayI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428902
M3dIHhmSweGRKyvMKdEDB4rIzrC0SDg4dua0hphU	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiSFVJQlllcGJ3b3NjVzZIUGNLTkJHZmxzU0g0TGo0ZFNoc05oU042WiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428902
vNndQoYfIVVhxSTPD25xiG2KnotgyWhOHghTWLRe	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiSTFLSGQ3SzNXQkN4bHN5ZmxsRmI0dlNMaDNMcTVGQmljOEpTSmpPMSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749428903
0iYkFebqi6582Ofshtnbwg7FFBWSWeOYJN996JOn	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiTFZOdWxCS1BTaDFSelRUWThBY3JBVE1hWE5BWWRyMGtkZWJDRFIwViI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749430220
NdnBaZyhvdtuQRAQEPdCT0m19TaBQyCioyxfux76	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiR0RLcEl6Z29qejR0dXdSZXE5MXFvR1Q4YWZwVlNId3FnM3pTbHBwQyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749430222
NqAC9QpWQHjtjZkva4vMVzrQHqgg9hiJu7k7C7SF	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiN1JEb1BoSTVVblplZkp5Z3R3SWhTM0JVU3hSV2k2d0RDSGx5dWJlUCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749430223
le9UttS5DtMgULlOuQGJdGthxgzdCTiy96HHOnBN	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiazhPdk42NlBmeEd2cEMwRUhMRXM2NjBwSnNJRUxVdkwwbnBTVTVjeSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL2QwZXZJVHZCZlhTZFhSMDh1TWFCQjdCdEtZa0d4djUxZHh4eVE4QlIuanBnIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749430302
vZMU801p5VKjsgFhDVheprDXfApk7N49EtJxXqPy	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiRzlIdjMybzAxU0E5TTFpbXpuT09lZjQySWRhbFBkVUtLREgyQ2NyTCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0s2WlpMd2lkanJNU0xWOG5IaXROa09oZ0Q3VFp3RXdsSFE1QXpVWUQuanBnIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749430305
RkpUP0hlVvAc7V0TmoDBWeVIskJnJyry7dL5UIxe	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiWjFGZXNRNnhlcllNdHVNdkdNcW9TYUpXTVVGT1RzSWh3bk56WDMyeSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL2xpUThxMzhHVDd5SjVMNVdDdVNFWWdvajZDT0hVbE1VWktzRTBZbDYuanBnIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749430305
6s4kdHcpuA7yP4Ta0vexvm1hiFgyK071ajOGCcAu	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiV3RZTWNwUnIyQ01xRnc0eUdkSllvNzB3T0N5czNxV0k4MEZSNjdMZyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749430458
lKD2Ayo0SZh5tg3ykrjql4UeyTtA7rsDtQsJ5CzW	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiWGxlbzV3dUJaTUdoZXhjcmVja2hITUg0VGZwOVk5cVBRbExaQUJtSiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749430459
veKprOgOwZCJBvYHam6D9isaKWYViMbEbHiWvvVI	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoieHc4TDFDQmlKY0dJRmF0dlVPczNXRFRmcnd5ZHpOdTVnM2pYMkFkdSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0Z3amlGRmFlY2tKZlliWHNFUHR2c01PeEVYdWtQenVaSlNLQUhwQ3oucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749430461
6sNN8zCB6NiyK8zvuFhzliW8xKBAlIN9XSsifIMh	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoia1hxcUVwSHo5aXFGUmVxVU1lSWNUNHlqOVkxbmtiNHpRNnlWeEt3YyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL1gwRGlSYUsyZERjcnRjOXpNY3Y2SjVoa1l0UXh3NWdBYU5LQTJEQ3AucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749430781
YEGTwOv0xiIqQoMBd9dGt1lOz3n6k0xNuD54tZbP	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiZGZKbVhPMGhhT1lWMkcxejkzNGkzc3lkeWVxTkkyUWtLV0pkbk55ZCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749431021
TtxJtoBjrW7eGW1yaoxn3vjTnmzgCIpICTurUCw9	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoielFxa0hiT1psVVUyY0VWalFPYkVZMzF0aEJXZ0NNRHRReTlqZ05xWCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749431021
F5akw57y4Gk0LkIySgOZ5bSWOsXSUqhI6FFLiKmX	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiQUwxTHVKaDFlemxKN0JIUlRFYWpFTDdrbGRsYnZTTkpSY0FxelZBbCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL1gwRGlSYUsyZERjcnRjOXpNY3Y2SjVoa1l0UXh3NWdBYU5LQTJEQ3AucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749431022
2i71SXBTkZX5PKKf5j4r0j2FcYL5tbST7IbdvSIW	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoidmhsN0lWbk40QVBlWGltSmRqbUhSSWJMWnVTa3lnN0g3WXd5ZW0yOSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL1gwRGlSYUsyZERjcnRjOXpNY3Y2SjVoa1l0UXh3NWdBYU5LQTJEQ3AucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749431098
3aGgsFG8DzptaOhBGk68XhaUxyoPnm9pQjgeIwiZ	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoicVJHQnY0UEk0akpnd0ptZkI3UzBMZjVNZFhMQ1JjbFUxZFRITFl3eSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0h3Y0NWS1lPMHJKelY1Rm53NU5GZVNFSzBGSU9CRTZDazkxWnQ3OWcucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749433243
SxKy1iaHjvQaXKHc5EbWrFL0kI3hHKEBJoe0m1zu	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiQU9mZll2YWZrNzNsOXZJajNPdk1vT2JXOFdGNmtITjRtVDc5TVFZMyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0h3Y0NWS1lPMHJKelY1Rm53NU5GZVNFSzBGSU9CRTZDazkxWnQ3OWcucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749433243
jW2r5NIrIItRf1Cn5fdcYmNWfLMkK85N0uNjsVmT	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoidHViTHp6bVVVVkxnbmVMS1JkWVRyWmU0cUhNSHdLR3ZNcmU2UTJqYiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0ZsV1NhYVpaSHhjZzBkMWRoWVpLNlJnMENER3RxRUZ0dzQ5Y3dlVTEucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749433246
DbSAaGToUjPQdNtXe9aK4rkdyQcNTwh8s7DlsKmr	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiWjlRWVRUUWp1ZmdQdmdHdGpuTDNqeXdRZ1pJUHJWcXUweHdrN0VMWCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0h3Y0NWS1lPMHJKelY1Rm53NU5GZVNFSzBGSU9CRTZDazkxWnQ3OWcucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749433248
g58WuXPsp0wlHonsFaNlHzc67R1G7pvrIdPAvkiJ	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiM1JOakNFcjFYYW9UeEIwRURtR3ZYNU9SZ1BFd1NsYUdBRktjWk1qSiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0h3Y0NWS1lPMHJKelY1Rm53NU5GZVNFSzBGSU9CRTZDazkxWnQ3OWcucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749433254
aTCc5vwlUvqHKOoT970MatMLsv9reCA0rSq25rnj	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiS1QxeW5oYWp2OU85UXd1a2EyZlFZazZyY0tQMXV3dkE0OFFkdVpOSiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0ZsV1NhYVpaSHhjZzBkMWRoWVpLNlJnMENER3RxRUZ0dzQ5Y3dlVTEucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749433255
MOtqpsEH3Go0pxKJDC4X2ZKuHLswAkn7xFWIG0VR	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiQ3lYbDlzTlFqUTVqZjhGNDNCSmpPR2NaTTNCT2VDb2RaZmtkTlZpZyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL2s2Q3RXNlJFRlVlOHlWREZCd0lad0I2S0gyVjB3SEV1bndpa0dtRkgucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749433269
Gk2GNe4rM4tSvRlP6ptMpiRzjwhXvtnl3RovVdkk	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiVXd0bEtpU0VweG5va0lEaDI2M3JyeHlQMTF4V0RGNTdUQVM5bzJ0ZSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL2s2Q3RXNlJFRlVlOHlWREZCd0lad0I2S0gyVjB3SEV1bndpa0dtRkgucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749433270
Nm6HQ6G1hiRUND7e9yADN4GOOPa6eVKOYwbZ0s9o	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoicHZqcXZyTWJkbkUxd2VtY0VJU1V6U0hzdXEzWEF0VG0wSHRNc1o1ZCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0h3Y0NWS1lPMHJKelY1Rm53NU5GZVNFSzBGSU9CRTZDazkxWnQ3OWcucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749433277
MNJAHmKhuzPCZx0UffTIzO8inRhQtMMqu0zfzbn5	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiSkQ4UkdFY21DTWNNOUI1czM2VkxUaGlUS05BNnByc3pqR0tkam5aSSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL2hEcGhnSnJuOExxWHVPSEZFZ2lZbHl6bncwRktGU1BvQ3lBbTBad2oucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749433299
uA8FseaP4BpeqyW817FkUgL5JbrkrJfLwBXrWyz5	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoicDFVMjFjbTU1VFZYZUFyalRFak1QbVVmTnN3MWpKTFFwVjFEbEFEOCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL052TE5tT1BYVGQwMGxEcWphYTlqSG51aW00OWExMlc4RFM5dTczT08ucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749433325
eY7vfCDLKnIABaHhP66n1HmGq9i6ecsQ3biiOGtA	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiSkRveHVLNzJQcTNaZmVhWVRlbGxPT1pzSnhqcWZsbUF3SUp0N0RHbiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL052TE5tT1BYVGQwMGxEcWphYTlqSG51aW00OWExMlc4RFM5dTczT08ucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749434824
LgjcaymcYcHOz9T9iAvJRwG51jCTxDqDJfTaUj8v	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoieFBQQWlJUjQ3bHZjb1FZWGt2SDU5TnZ2TjVxWFk3eFFTZ0ZWV3ZLbiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749435010
bhROYZxCAc6vj25lwXTz6E8dURUzixRdYOxTZnHO	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiQ1lWV2pKSTJoNzVtSDB2MWZXTEFBNXFWSG1oclc3SHE1S1lkOHNDMCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749435010
mzmGYMoLyDh6Uk8mqzUaPKNUb7hBthTanTBYOGaw	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiZ2Q4RDNiMk9VbERydW9qR09mQzBqaUxSaEdVUGozZVRlOTFMRnZBbyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL1gwRGlSYUsyZERjcnRjOXpNY3Y2SjVoa1l0UXh3NWdBYU5LQTJEQ3AucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749435011
oG8fKepc0waiV2UtOlDX4ANR0kiR3rreCiE3gfyt	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoid3YwdXJQb0ROOE41YndQc1lqOE5xT2NSbHg4S2FTMkNRbUJvak9CRiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL1hhcWRwanNFczdHNlF4MldtbnpWd3Z3blh4ZTEyZHNYbkFZQkFISGcucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749435051
b1lz2R55DkY8sWu0H8cc8Kje1pFUdRWLDk0JrlKj	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiNUZveDdRZVhFdFhBNmp4aGFEekxHVG1pc3RSdkUzb0s5azBxU3d4WCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL1Z5bENBYjUxRzd2OUFwcERCeFB3WmNmSXJGdzJzeW1MaldYbVpvakoucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749436731
R9bmhHCibHkwEOfEsLhceyf78r5EXdI7h7vlpzGx	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiZWlTWkpRTUNqRmI2a3JxbGI1bFVzTFFaYU54NGpybUR1QXJtSHUwOCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL1Z5bENBYjUxRzd2OUFwcERCeFB3WmNmSXJGdzJzeW1MaldYbVpvakoucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749436732
RRZVlnA8TqLWZMfgAQmLzKAvOjJxKInIzDCcT7lH	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoicklZWEhLWllKR1dkdFIyN2p0UDZBRFhuSjV1SUxNaG85R2JmUE13ViI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0FXdnBXRUhwQW00SWNQN1J4cDlNdTBubjVZVFFLUTZia1dtSXp0STkucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749516998
HYKvoOUOHkyBq40DFEKNRh2t6kkC5fB7AmY5mJ0d	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiZzBwcmw0SFg0Z3p0RW83eVFMR1FOejZHbk0zV2E4MVVQNG9hWFBlSyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3hiOFBtbUk3eUh6RGZHdFp2eGVlTG95TFNVSlRHVk55T0ViYXFtQksucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749517008
CaxL2DV5pZuJRPdwunGRwxWegYQZhqumQXzrzub8	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiTzB2TzVHUHR0c0tOcHFselJpSW5pU0haTWI2cmNVMDZGMk1lWjRtbSI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0lDbUhCdm5TeHB2bGhtcjVZNDN4czk2QjZEdE1jT1BLRkJqOGlTODEucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749517010
T8pVpEVtDlr64PqRdXQdMKIQpDRFL2ByXAKO2S5Q	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiaXppb0prMEV2cXJ5TEFzUGxKaDFORGlSOUZPa2ZLRXBYYVU2V3paTCI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL3RUTUxCUnhnNFpLM0dCdVl3SHRDenZqSHo0eWJ3MXRvbjZsTG04MUkucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749517011
qMembMIwUDDDlb8mbEQpBnMZ8D2vcvJVKJeVHIN3	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoibkVkQUVUUlBlVUxzNFBuVzlJQXZBeHJJUHJGaU11cmZnYkk1YlBjYyI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL1hhcWRwanNFczdHNlF4MldtbnpWd3Z3blh4ZTEyZHNYbkFZQkFISGcucGRmIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749517011
NfzAx5HHDSYiz2koWv1f6fP3vwW4sUmZyFDTiNsL	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoiOEZzb2RyVGtCN3pQWXhFNk1YMWZYUExSUW02cnpCNGdmYnhLOGhFViI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzc6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL1UzNVBFNG5Ya1MzelhQV1duSHZ6dmZ0c1BCeU5uQWtjcGZlQTZZMlgucG5nIjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==	1749517327
cOviRFlSoBL8yWjNB2ThRyqTwy5szmfR6jxbatny	\N	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0	YTozOntzOjY6Il90b2tlbiI7czo0MDoidUhEU2VKTUxGYUZuazlEV1pDM2N0cDliRjgwMkZnajdibGJUWm5tUiI7czo5OiJfcHJldmlvdXMiO2E6MTp7czozOiJ1cmwiO3M6Nzg6Imh0dHA6Ly9sb2NhbGhvc3Q6ODAwMC9zZWN1cmUtcGRmL0JGR3FsTFhsUGJCOEwxSTNXeWhXQnNrbGJ2WnE3YzBaQWpPODlaTmUuZG9jeCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=	1749517334
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, email_verified_at, password, remember_token, created_at, updated_at) FROM stdin;
\.


--
-- Name: document_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.document_groups_id_seq', 11, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.documents_id_seq', 29, true);


--
-- Name: failed_jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.failed_jobs_id_seq', 1, false);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jobs_id_seq', 1, false);


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 5, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: cache_locks cache_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cache_locks
    ADD CONSTRAINT cache_locks_pkey PRIMARY KEY (key);


--
-- Name: cache cache_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cache
    ADD CONSTRAINT cache_pkey PRIMARY KEY (key);


--
-- Name: document_groups document_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_groups
    ADD CONSTRAINT document_groups_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_pkey PRIMARY KEY (id);


--
-- Name: failed_jobs failed_jobs_uuid_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.failed_jobs
    ADD CONSTRAINT failed_jobs_uuid_unique UNIQUE (uuid);


--
-- Name: job_batches job_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_batches
    ADD CONSTRAINT job_batches_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (email);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: jobs_queue_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX jobs_queue_index ON public.jobs USING btree (queue);


--
-- Name: sessions_last_activity_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_last_activity_index ON public.sessions USING btree (last_activity);


--
-- Name: sessions_user_id_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_user_id_index ON public.sessions USING btree (user_id);


--
-- Name: documents documents_document_group_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_document_group_id_foreign FOREIGN KEY (document_group_id) REFERENCES public.document_groups(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

