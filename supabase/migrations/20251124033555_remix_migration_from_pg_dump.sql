CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



SET default_table_access_method = heap;

--
-- Name: health_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.health_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    log_date date DEFAULT CURRENT_DATE NOT NULL,
    aqi integer NOT NULL,
    pm25 numeric(10,2) NOT NULL,
    outdoor_time integer NOT NULL,
    age integer NOT NULL,
    gender text,
    has_symptoms boolean DEFAULT false,
    symptoms text[],
    phri numeric(10,2) NOT NULL,
    location text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    wearing_mask boolean DEFAULT false
);


--
-- Name: health_logs health_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.health_logs
    ADD CONSTRAINT health_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_health_logs_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_health_logs_user_date ON public.health_logs USING btree (user_id, log_date DESC);


--
-- Name: health_logs Users can create their own health logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own health logs" ON public.health_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: health_logs Users can delete their own health logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own health logs" ON public.health_logs FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: health_logs Users can update their own health logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own health logs" ON public.health_logs FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: health_logs Users can view their own health logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own health logs" ON public.health_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: health_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


