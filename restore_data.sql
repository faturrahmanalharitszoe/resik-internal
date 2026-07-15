--
-- PostgreSQL database dump
--

\restrict 0icXRdzVzhIeTP6nBus8tHaWNBxKodfDheWAaMd5JHTUxWb3ArlY40ijnF8bh3T

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.users DISABLE TRIGGER ALL;

COPY public.users (id, username, display_name, email, password_hash, avatar_url, is_online, last_seen, created_at, division, role, jabatan, is_admin) FROM stdin;
a61e6884-b703-42a3-98e8-0af5ca763cc3	keuangan_sm	SM Keuangan	keuangan_sm@example.com	$2a$12$i38whk1c5c/9J/EslU9t7erflsdodht1RWi75U03jbLB3s5NRuEl2	\N	f	2026-07-14 14:23:06.451767+07	2026-07-14 14:23:06.451767+07	keuangan	management	SM	f
086dced1-7f23-4f2d-bd54-26a1c5099767	keuangan_staff	Staff Keuangan	keuangan_staff@example.com	$2a$12$i38whk1c5c/9J/EslU9t7erflsdodht1RWi75U03jbLB3s5NRuEl2	\N	f	2026-07-14 14:23:06.455469+07	2026-07-14 14:23:06.455469+07	keuangan	staff	Staff	f
4b901e83-4a75-41c9-98ed-1ce9438d30b2	bellaherdii20	Bella Kurniawati	bellaherdii20@gmail.com	$2a$12$UtQWW/.tgt7lfZqlXlQI/O6d0RVjqWDyW7NJKUpcxrJiPvyfZIzXC	\N	f	2026-07-15 21:02:20.027149+07	2026-07-14 14:41:25.968997+07	marketing	staff	Staff	f
54b3e957-805d-48d9-9d86-3acc7e96b871	danieltaulo27	DANIEL TAULO	danieltaulo27@gmail.com	$2a$12$OrLH9.K/nDFLfI4M/bAft.E6ZaTLqMubZLjk.W73wZ4D254Sd7IBW	\N	f	2026-07-15 13:04:11.194128+07	2026-07-14 15:12:55.047061+07	keuangan	management	Manager	f
fa71468a-d40e-42a5-9260-d98cd737e759	citramarie	CITRA MARI INDAH	citramarie@gmail.com	$2a$12$blXRnIxW4K3SVsxa1lipvee0lhiqTd/WdfN3i0QuIa5oSU6kPJ.bO	\N	f	2026-07-14 14:41:49.395114+07	2026-07-14 14:41:49.395114+07	marketing	staff	Staff	f
76c2962d-3ff1-4b6e-83c5-261f19d4604d	anggadinataresikcemerlang	Angga Dinata	anggadinataresikcemerlang@gmail.com	$2a$12$jFa.WM6Tkh4C4AUvDCG.QuDBW24b6h.wyEe5mBF8BakRVDQMd9lcS	\N	f	2026-07-14 14:42:27.219375+07	2026-07-14 14:42:27.219375+07	marketing	management	Asisten Manager	f
627f9b17-865d-47a6-be1e-81f10b45b094	leony.mondelia	LEONY MONDELIA	leony.mondelia@gmail.com	$2a$12$mT4c0Sl6.mw5cQrSFU3.U.xiqUzCRTLLR4gCvPTEH2ncTMEO6t1AW	\N	f	2026-07-14 14:43:08.927924+07	2026-07-14 14:43:08.927924+07	marketing	staff	Staff	f
df396512-3fb0-4fe0-893f-df81efcbb6b0	yusuprahman100	Yusuf Rahman	yusuprahman100@gmail.com	$2a$12$.GjmlenPE4iJegY.9R61tO/5eCV0hhneHFEB5GQu3kYnTlI8DS3Z2	\N	f	2026-07-14 15:06:47.843235+07	2026-07-14 15:06:47.843235+07	keuangan	staff	Staff	f
05f22bed-74c6-41fa-b139-0126f763fde1	yayuksri2405	Yayuk Sri Rahayu	yayuksri2405@gmail.com	$2a$12$kK.TLzsrOC4s0sNpCOUkfeWeGItricJNLznVHNcCjjM0Fu1XSeLwi	\N	f	2026-07-14 15:07:27.331764+07	2026-07-14 15:07:27.331764+07	keuangan	management	Asisten Manager	f
01d866c2-615a-4bd7-b730-e4592e881ee6	dir_umum_test_195lu	Direktur Umum Test	dir_umum_ucfzbf9@example.com	$2a$12$.uxEXwYqIyhFpEMIDzSjfu9idAfoFrvH9fk3Ftx0ip8FOIRGfHHym	\N	f	2026-07-14 14:51:14.623999+07	2026-07-14 14:51:14.623999+07	operasional	top management	Direktur Umum	f
a873a7b8-fcf1-4716-a626-0839a801fba9	wadir_test_l57adc	Wakil Direktur Test	wadir_p4zuz@example.com	$2a$12$rIQ8EEh39fMfCcPw96TeZ.cJjVYNGwopcolL20.LFnbo8krcURurS	\N	f	2026-07-14 14:51:15.117668+07	2026-07-14 14:51:15.117668+07	operasional	top management	Wakil Direktur	f
7f6aa9b6-0ba9-4c86-b56c-0b472d4b9caa	ikkamuflikah1708	Muflikah	ikkamuflikah1708@gmail.com	$2a$12$md.JQIYY.V9Y.Avdh0giAOiLHv.IAyQoEkb8TDK6A4LjRLIzQ8UgO	\N	f	2026-07-14 15:08:24.430465+07	2026-07-14 15:08:24.430465+07	keuangan	staff	Staff	f
125775d7-7f89-4620-b162-65067863af8f	bungaraudya8	BUNGA RAUDYA TAUZZAHRA	bungaraudya8@gmail.com	$2a$12$3KqwfbPVybRX3RUxHHR3AuoIyfBqtnx/MLTHOZDjG42rG23WopAPi	\N	f	2026-07-14 15:09:24.679293+07	2026-07-14 15:09:24.679293+07	keuangan	staff	Staff	f
3c01363b-acf9-4c78-bb7d-58267b30f595	wadir_test_bahg64	Wakil Direktur Test	wadir_vgnn1c@example.com	$2a$12$auslFkgpzi3toA3EwQl23.C91twC09VUORT9z/WRj5vB/G.yuBxwu	\N	f	2026-07-14 14:36:05.314588+07	2026-07-14 14:36:05.314588+07	operasional	top management	Wakil Direktur	f
ddbf22ed-0dac-45de-97fd-440562f6eb63	yosiwijayanto	YOSI WIJAYANTO	yosiwijayanto@gmail.com	$2a$12$iRiTPsu6eJo0zfNHgbWEAuDyFYBDEH9Chn/C0IIWLKcmsgGv8ZKNq	\N	f	2026-07-14 15:09:41.108214+07	2026-07-14 15:09:41.108214+07	keuangan	staff	Staff	f
82e1b41f-6a13-49f3-a9ef-accc1dcb9f1b	p	Pandu Wibisono	p@gmail.com	$2a$12$4tDlk.LL0ucH2cA3abCYF.uZaYt6mcDxPjijmJX6gIxTKVI.DVLTa	\N	f	2026-07-14 15:15:29.295162+07	2026-07-14 15:15:29.295162+07	sdm	staff	Staff	f
189967ba-fb56-4f73-9ccc-5f96fb0f0773	rharacri04	Rahayu	rharacri04@gmail.com	$2a$12$de0SMyJfW5lxlOzxZqVik.EpYhrDBoRm1/Oeb2Fq9QXQ6m9ZBjFhK	\N	f	2026-07-14 15:16:11.817757+07	2026-07-14 15:16:11.817757+07	sdm	staff	Staff	f
159b031c-f1e6-4b66-8121-80bee237ec0d	hupangcoki	Hupang Sahat K	hupangcoki@gmail.com	$2a$12$aLGxXw6dwYf8Q6hjHf2PRObP2RXkOXu3.A3Df5Ek27fC.Fi8Wb/02	\N	f	2026-07-14 15:13:24.345265+07	2026-07-14 15:13:24.345265+07	keuangan	management	Manager	f
a7cb07d3-ba25-4dbd-8019-452be3261a69	jayadi.mkt	Jayadi	jayadi.mkt@resikcemerlang.id	$2a$12$w.nyfAefxMfnRpN5wLW7Nuj/0Ljzq8a2C53pA3RqZAAFnqeFL3B0i	\N	f	2026-07-14 15:14:27.825207+07	2026-07-14 15:14:27.825207+07	marketing	management	Senior Manager	f
e08c07fc-4e03-45a8-9a96-f76b6f4ef218	hamzahaenunhaq	Hamzah Ainun Haq	hamzahaenunhaq@gmail.com	$2a$12$yuZOpiWjt2KTIAR2cg8R7eR2zvraDWU.wahOA8EM2WGVUy1NW0JrW	\N	f	2026-07-14 15:15:06.534901+07	2026-07-14 15:15:06.534901+07	sdm	staff	Staff	f
91497e52-2c82-42de-b4fc-d357c2b15ea1	nurhyatinci00	Nurhayati	nurhyatinci00@gmail.com	$2a$12$/BJHUwhxnfFm1vEtm6vYIubnT9MDeW2wSN0mpBwnOk5f2QQiEYs3a	\N	f	2026-07-14 15:16:32.361684+07	2026-07-14 15:16:32.361684+07	sdm	staff	Staff	f
0ab4fb6b-d318-4c70-b5d1-fd7db810008a	Rdoni30	Achmad Ramdhoni	Rdoni30@gmail.com	$2a$12$gJsWclZ2iylbKeM8VzR1qODHTyrMVuAXtSW87f0rBi9nw6w8fv5BC	\N	f	2026-07-14 15:16:52.206371+07	2026-07-14 15:16:52.206371+07	sdm	staff	Staff	f
a94a8d1f-c6c1-4202-8c3c-8ddb69e0a9c6	khairunnisasha11	KHAIRUNNISA	khairunnisasha11@gmail.com	$2a$12$ruHNj7uGVPBYJ2wAeZ5gw.r/JKJhfK5eOvJ5Cz1TvrXNrc41.K5vi	\N	f	2026-07-14 15:17:11.897045+07	2026-07-14 15:17:11.897045+07	sdm	staff	Staff	f
97a58d10-3a80-43f7-bcb2-a040eee9030e	wadir_test_wi4df	Wakil Direktur Test	wadir_7k2apl@example.com	$2a$12$Gjgm.Sqgo6mM2Xof2VVaO.RErw00SNdUBuzQ/s.fF/4JTmRqg0Qzm	\N	f	2026-07-15 21:01:20.559206+07	2026-07-14 14:30:13.249048+07	operasional	top management	Wakil Direktur	f
c55d7a15-5fc0-4016-b1ed-2bdc294b3c68	norwind16	Norwind Alfasyah	norwind16@gmail.com	$2a$12$KDTniARwhhgciq2W2y0Bgur6oVauAquoSeg1ZuL8J8IMXtw6rParW	\N	f	2026-07-15 12:44:11.914799+07	2026-07-14 15:07:57.862458+07	keuangan	staff	Staff	f
02d4fd0e-ff31-4bbb-8e50-4fe4fe1cfc09	wadir_test_56gh3p	Wakil Direktur Test	wadir_klthyw@example.com	$2a$12$wr0OmHy0.meKUh1tGkMj8exjbLS8Cni85y6DPhhxCQCXhMWBkNtMu	\N	f	2026-07-15 21:00:23.125142+07	2026-07-14 14:23:48.078861+07	operasional	top management	Wakil Direktur	f
18d7745a-ecd8-405e-acbd-cab110317f2e	amdhitaa	Anissa Meidita Putri	amdhitaa@gmail.com	$2a$12$ok2wCm./JKWw/5cBXV/RTuhJVQQTtVOBzMdlDudf67A5.SKGnAaou	\N	f	2026-07-15 21:01:20.915027+07	2026-07-14 14:41:05.368851+07	marketing	staff	Staff	f
fac72cd4-06a8-457f-ba5e-8a54b88a211f	wadir_test_6r6tyo	Wakil Direktur Test	wadir_loyh7r@example.com	$2a$12$X/xGfqPU792lTIA/dA/w0.SgS2opbNx876mV7H4zkb7sKfejQabMS	\N	f	2026-07-15 20:58:36.043772+07	2026-07-14 14:23:13.657655+07	operasional	top management	Wakil Direktur	f
6fe545d6-2c54-46bd-b554-792bee6f07bb	marketing_staff	Staff Marketing	marketing_staff@example.com	$2a$12$i38whk1c5c/9J/EslU9t7erflsdodht1RWi75U03jbLB3s5NRuEl2	\N	f	2026-07-15 20:58:36.04453+07	2026-07-14 14:23:06.435855+07	marketing	staff	Staff	f
facd612f-e882-4b3e-8ac1-ae23c24092eb	wadir_test_aequs	Wakil Direktur Test	wadir_gu534p@example.com	$2a$12$wIrgfW/Vz3.6wLDPJmE91OVFoaMzi76JjyV6IzIb.pArLtQUwko5.	\N	f	2026-07-15 21:02:19.325188+07	2026-07-14 14:31:05.765687+07	operasional	top management	Wakil Direktur	f
354bdf45-122a-4cd6-95f8-818b61e813bc	nairarevalina25	NAIRA REVALINA	nairarevalina25@gmail.com	$2a$12$njhADq2Kt1ikhIJBGsEv/u1Ntlet.PcT3dTSzi3zsO9yThmxnED/S	\N	f	2026-07-14 15:17:48.045667+07	2026-07-14 15:17:48.045667+07	sdm	staff	Staff	f
d04af276-8fa1-44f1-9d6a-c6ee58d95a77	sinta.0988	SINTA DEWI SULISTIOWATI	sinta.0988@gmail.com	$2a$12$yNHCuoqEGDhIpACuIYWnAOrvgrPhF4m84x10jyZrv4ESQupmtuAEu	\N	f	2026-07-15 20:40:49.013758+07	2026-07-15 20:40:49.013758+07	operasional	staff	Staff	f
3168c16a-9c92-498f-bfa9-71a0706b946c	puji_ibnu	Puji Rahayu	puji_ibnu@yahoo.co.id	$2a$12$NRkoyuaEiC0YjiTPjIGqF.LzWaHxaDXNhCxcIP4vpUDQ16VTfo.i6	\N	f	2026-07-15 20:41:17.26672+07	2026-07-15 20:41:17.26672+07	operasional	staff	Staff	f
9982cb9d-4872-4769-9316-63a9e4e61207	wadir_test_89wy2i	Wakil Direktur Test	wadir_vaz9p@example.com	$2a$12$RPpGZ4KO26E7xruApflXweQZH7xnBz29bGH.lG0NZ0BhPiW84XFVi	\N	f	2026-07-14 15:23:19.445978+07	2026-07-14 15:23:19.445978+07	operasional	top management	Wakil Direktur	f
5e9445bc-dca1-49f4-9158-87b8b3da1d9b	ekipramana1	Eki Pramana	ekipramana1@gmail.com	$2a$12$.G8xR.yPlOKQ6E7X0UDzT.Gkaq4fovA9g6QDZYj25PlNwsWbHDjQu	\N	f	2026-07-15 20:42:01.568507+07	2026-07-15 20:42:01.568507+07	operasional	staff	Staff	f
ba3bd465-1674-416c-a0b4-e71c149edc92	sardahnurlia96	Sardah Nurlia	sardahnurlia96@gmail.com	$2a$12$NuD.lNsT4OzYDhsf8i1IMufeWJgujE3TEhHB4RrrYk/vs9XY8kHo.	\N	f	2026-07-15 20:42:20.647106+07	2026-07-15 20:42:20.647106+07	operasional	staff	Staff	f
bcedcb09-5313-4c50-a806-7ce2341b38f5	admin	Administrator	admin@company.com	$2a$12$fudgnA1V.07ovWykuv0IOuswGYvL3Jh58dYWTTQk6iQGomu4IErFK	\N	t	2026-07-15 21:05:29.199402+07	2026-07-14 14:20:35.461299+07	sdm	admin	Administrator	t
a4ce8f0d-8b00-44d0-bd8c-53971dd6c3bd	farrellalifia	FARRELL ALIFIA NUGROHO	farrellalifia@gmail.com	$2a$12$grbKUSOmH0SUaRXv2Fm5F.2AK5RUMRqW6aQM0ayom122S4LADRsEi	\N	f	2026-07-15 20:46:35.483163+07	2026-07-15 20:46:35.483163+07	operasional	staff	Staff	f
19e341af-bc64-462d-84d5-2fd240ca5033	paruliantambunanops	Parulian	paruliantambunanops@gmail.com	$2a$12$p4zlroWuO40JTLg/YaZNKeecPjZ91LTFeFfdjGha6uxqckUgnCxCW	\N	f	2026-07-15 20:47:02.93165+07	2026-07-15 20:47:02.93165+07	marketing	staff	Staff	f
8e52c0f7-7832-49c6-a4a1-c445fe31d363	megaasih22	Mega Asih	megaasih22@gmail.com	$2a$12$pMvGCwg3wHomUKpnunyOeuBH5Ap7RFRTIGd/AWY3r/p/FBjTrEyZK	\N	f	2026-07-15 20:48:19.866239+07	2026-07-15 20:48:19.866239+07	operasional	staff	Staff	f
ad671fc0-194b-459c-a095-88ba46057935	dwikytama	DWIKY PRATAMA	dwikytama@gmail.com	$2a$12$/2AOKD.LctwzkpmA52WCK.F0kP2UhzWwUOEQIKCGFGChwV.uMMt8C	\N	f	2026-07-15 20:48:37.194605+07	2026-07-15 20:48:37.194605+07	operasional	staff	Staff	f
87e8c72e-6bcf-406b-a273-458abf133e96	bullenovember	ACHMAD FADLI	bullenovember@gmail.com	$2a$12$ABcI6whhVBLxueDG.aXkTOUSIFTdEpa9FW9SxxV6Y.q8/uX.qwvOi	\N	f	2026-07-15 20:48:56.178218+07	2026-07-15 20:48:56.178218+07	operasional	staff	Staff	f
dd94603b-0eff-4a54-bc23-3fe1629ec663	corneliusvidi123	KURNELIUS VIDI KRISTANTO	corneliusvidi123@gmail.com	$2a$12$C1Jt17KyGmp//mVLOMlPMet8KQeD4UVZSOm/S5Ycy1TmJbom5Ae76	\N	f	2026-07-15 20:49:20.465861+07	2026-07-15 20:49:20.465861+07	operasional	staff	Staff	f
456b3080-5c8c-40a5-af26-0388d9735563	joko.purwoto	Joko Purwoto	joko.purwoto@resikcemerlang.id	$2a$12$0PdwidRSsb3Vk80GKqghDuaNt7BZwUqZ.JEbtwfIYKvC8wqXUvHa2	\N	f	2026-07-15 20:50:17.995074+07	2026-07-15 20:50:17.995074+07	\N	top management	Direktur Umum	f
9f72f61e-bd5d-42cf-9544-44841ffc0b56	budi.anitarini	Budi Anitarini	budi.anitarini@resikcemerlang.id	$2a$12$lx/zuMqiyR5B6745GnvAC.1kWA3c1k/AOdAaBgUv9cSxBz/ltz1Oi	\N	f	2026-07-15 20:51:46.122197+07	2026-07-15 20:51:46.122197+07	\N	top management	Wakil Direktur Utama	f
0eb084a6-237b-43f2-9848-d9567aac91a7	ridwan.ops	RIDWAN	ridwan.ops@resikcemerlang.id	$2a$12$ntY4CQvAa7D9HmHF6Bh3k.a2HZKGXQ8UCKnUs3iHioV4magNTo4Oe	\N	f	2026-07-15 20:45:07.116992+07	2026-07-15 20:45:07.116992+07	operasional	management	Manager	f
ed1a0f56-6f70-4ea8-9111-f1656d5150c0	chandra	MOCHAMAD CHANDRA ISNAENI	chandra@resikcemerlang.id	$2a$12$CKqHsK.4fTN3Uby4YKfx/.waNPkTc6anLdz6f/co7P/WzuJClOj2e	\N	f	2026-07-15 20:41:43.767328+07	2026-07-15 20:41:43.767328+07	operasional	management	Asisten Manager	f
1c901f39-a59b-4432-ab10-3fd404c047d8	herobean_hc	HERU WIBOWO	herobean_hc@yahoo.co.id	$2a$12$k890WcS6Opsx4u2k8Zurveczo6J971M4VCZfUN8/ZahdudBsg5hLS	\N	f	2026-07-15 20:33:26.316838+07	2026-07-14 15:17:28.282648+07	sdm	staff	Staff	f
258a3115-0523-4b73-acb2-9f37d403d4c5	kinkin.ag2018	Kinkin Sodikin	kinkin.ag2018@gmail.com	$2a$12$2kMYKhaK7ipXEbki8Z0.eefoNDwz2Re5GjIFbCzEwdCVsQkjIwpk.	\N	f	2026-07-15 21:02:19.548491+07	2026-07-14 15:18:21.371189+07	sdm	management	Manager	f
a5650797-bd92-4bb6-bdcb-1f2cd5cb0d4c	saripudin	Saripudin SH	saripudin@resikcemerlang.id	$2a$12$H636ZSZ3RBmkQhniU8iUG.jpoq0GvAFtVTHeA56leejJAMzdsJxrO	\N	f	2026-07-15 21:00:51.296729+07	2026-07-14 15:18:51.610042+07	sdm	management	Senior Manager	f
70b48927-30cb-4140-90f7-2eb2a14acca4	budi.artiningrum	Budi Artiningrum	budi.artiningrum@resikcemerlang.id	$2a$12$A3if6voZ63egNLd67A1Y0.qb.hDalcOnJyM6aXuWVRKe0hWi5xKRm	\N	f	2026-07-15 21:06:39.130104+07	2026-07-15 20:51:18.802371+07	\N	top management	Wakil Direktur Utama	f
\.


ALTER TABLE public.users ENABLE TRIGGER ALL;

--
-- Data for Name: shared_documents; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.shared_documents DISABLE TRIGGER ALL;

COPY public.shared_documents (id, project_name, document_type, sub_tipe, document_name, document_number, description, file_path, sender_name, sender_division, user_id, penerima, tgl, created_at) FROM stdin;
3a137c74-287c-471e-961a-9448bddca0ca	Proyek A	Laporan	Bulanan	Laporan Bulanan Marketing ke SM Keuangan	DOC-2026-001	Ini deskripsi laporan	/uploads/1784013792619-992203158.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	SM Keuangan	2026-07-14 14:23:12.624928+07	2026-07-14 14:23:12.624928+07
d656bd30-8ede-481b-a9ad-1a2d582f2f59	Proyek A	LOI	Penawaran	LOI Penawaran Kerjasama	LOI-2026-999	Ditujukan ke Direktur Umum	/uploads/1784013793667-833363171.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	Direktur Umum	2026-07-14 14:23:13.670317+07	2026-07-14 14:23:13.670317+07
a0e8ad86-9c6f-4a28-b828-d5c0ab1259f2	Proyek A	Laporan	Bulanan	Laporan Bulanan Marketing ke SM Keuangan	DOC-2026-001	Ini deskripsi laporan	/uploads/1784013826427-934506170.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	SM Keuangan	2026-07-14 14:23:46.439575+07	2026-07-14 14:23:46.439575+07
f2771e22-ac2c-4738-bc81-5163645c15a2	Proyek A	LOI	Penawaran	LOI Penawaran Kerjasama	LOI-2026-999	Ditujukan ke Direktur Umum	/uploads/1784013828099-118991385.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	Direktur Umum	2026-07-14 14:23:48.103552+07	2026-07-14 14:23:48.103552+07
6776a48c-f413-4ca8-9914-7efa28fd6a2f	Proyek A	Laporan	Bulanan	Laporan Bulanan Marketing ke SM Keuangan	DOC-2026-001	Ini deskripsi laporan	/uploads/1784014211906-830471579.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	SM Keuangan	2026-07-14 14:30:11.915158+07	2026-07-14 14:30:11.915158+07
6736854f-454b-4a83-ab52-9461d9a3f5cf	Proyek A	LOI	Penawaran	LOI Penawaran Kerjasama	LOI-2026-999	Ditujukan ke Direktur Umum	/uploads/1784014213266-996887537.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	Direktur Umum	2026-07-14 14:30:13.270216+07	2026-07-14 14:30:13.270216+07
c3bd5dee-fb95-4087-a718-0a6b284de5db	Proyek A	Laporan	Bulanan	Laporan Bulanan Marketing ke SM Keuangan	DOC-2026-001	Ini deskripsi laporan	/uploads/1784014264535-974844989.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	SM Keuangan	2026-07-14 14:31:04.542284+07	2026-07-14 14:31:04.542284+07
9f10c66d-5adc-44d8-86da-293816c21b60	Proyek A	LOI	Penawaran	LOI Penawaran Kerjasama	LOI-2026-999	Ditujukan ke Direktur Umum	/uploads/1784014265778-811894017.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	Direktur Umum	2026-07-14 14:31:05.781043+07	2026-07-14 14:31:05.781043+07
8bce63fd-4078-4e36-8eb8-0528bbac57da	Proyek A	Laporan	Bulanan	Laporan Bulanan Marketing ke SM Keuangan	DOC-2026-001	Ini deskripsi laporan	/uploads/1784014479928-905694913.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	SM Keuangan	2026-07-14 14:34:39.936347+07	2026-07-14 14:34:39.936347+07
78b8ec41-d07e-43e0-943b-147208a1f9c0	Proyek A	Laporan	Bulanan	Laporan Bulanan Marketing ke SM Keuangan	DOC-2026-001	Ini deskripsi laporan	/uploads/1784014564301-124831189.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	SM Keuangan	2026-07-14 14:36:04.305445+07	2026-07-14 14:36:04.305445+07
15b2ce67-0d2e-468c-9cd2-b781509d520f	Proyek A	LOI	Penawaran	LOI Penawaran Kerjasama	LOI-2026-999	Ditujukan ke Direktur Umum	/uploads/1784014565324-307700361.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	Direktur Umum	2026-07-14 14:36:05.327248+07	2026-07-14 14:36:05.327248+07
af561434-224b-4d1c-9b5c-118de30d7712	Proyek A	Laporan	Bulanan	Laporan Bulanan Marketing ke SM Keuangan	DOC-2026-001	Ini deskripsi laporan	/uploads/1784015473965-701836012.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	SM Keuangan	2026-07-14 14:51:13.970213+07	2026-07-14 14:51:13.970213+07
c7c64d66-8396-4ac5-bf1e-b3e51b61c520	Proyek A	LOI	Penawaran	LOI Penawaran Kerjasama	LOI-2026-999	Ditujukan ke Direktur Umum	/uploads/1784015475128-785061621.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	Direktur Umum	2026-07-14 14:51:15.130813+07	2026-07-14 14:51:15.130813+07
22f5e12b-e6f1-4d29-b549-0020d29355f6	Pengadaan Unit Kerja	PO	PO Proyek A	PO Tes	00123//asd/123		/uploads/1784016286328-713240719.xlsx	Anissa Meidita Putri	marketing	18d7745a-ecd8-405e-acbd-cab110317f2e	Staff Keuangan,Staff Operasional	2026-07-14 00:00:00+07	2026-07-14 15:04:46.37765+07
03786bdc-b0d7-4ad3-83fb-734d8ca16c76	Proyek A	Laporan	Bulanan	Laporan Bulanan Marketing ke SM Keuangan	DOC-2026-001	Ini deskripsi laporan	/uploads/1784017398551-283273316.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	SM Keuangan	2026-07-14 15:23:18.559099+07	2026-07-14 15:23:18.559099+07
487c6fab-7baa-4ad9-bc14-690ddf9ed891	Proyek A	LOI	Penawaran	LOI Penawaran Kerjasama	LOI-2026-999	Ditujukan ke Direktur Umum	/uploads/1784017399464-985942836.pdf	Staff Marketing	marketing	6fe545d6-2c54-46bd-b554-792bee6f07bb	Direktur Umum	2026-07-14 15:23:19.466263+07	2026-07-14 15:23:19.466263+07
\.


ALTER TABLE public.shared_documents ENABLE TRIGGER ALL;

--
-- Data for Name: document_views; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.document_views DISABLE TRIGGER ALL;

COPY public.document_views (id, document_id, viewer_name, viewer_jabatan, viewer_division, viewed_at) FROM stdin;
1	22f5e12b-e6f1-4d29-b549-0020d29355f6	DANIEL TAULO	Manager	keuangan	2026-07-15 13:00:30.517499
2	22f5e12b-e6f1-4d29-b549-0020d29355f6	DANIEL TAULO	Manager	keuangan	2026-07-15 13:02:51.139026
3	22f5e12b-e6f1-4d29-b549-0020d29355f6	DANIEL TAULO	Manager	keuangan	2026-07-15 13:03:50.050264
4	22f5e12b-e6f1-4d29-b549-0020d29355f6	DANIEL TAULO	Manager	keuangan	2026-07-15 13:03:57.417215
5	22f5e12b-e6f1-4d29-b549-0020d29355f6	Anissa Meidita Putri	Staff	marketing	2026-07-15 13:04:27.775379
6	22f5e12b-e6f1-4d29-b549-0020d29355f6	Anissa Meidita Putri	Staff	marketing	2026-07-15 13:04:30.725445
7	22f5e12b-e6f1-4d29-b549-0020d29355f6	Anissa Meidita Putri	Staff	marketing	2026-07-15 13:04:38.647743
8	22f5e12b-e6f1-4d29-b549-0020d29355f6	Anissa Meidita Putri	Staff	marketing	2026-07-15 13:05:04.510503
9	22f5e12b-e6f1-4d29-b549-0020d29355f6	Anissa Meidita Putri	Staff	marketing	2026-07-15 13:05:08.521986
\.


ALTER TABLE public.document_views ENABLE TRIGGER ALL;

--
-- Data for Name: rooms; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.rooms DISABLE TRIGGER ALL;

COPY public.rooms (id, name, type, created_by, created_at) FROM stdin;
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	General	group	\N	2026-07-14 14:20:40.804823+07
426f8825-ad49-40d5-8bd3-c220c446326f	Marketing	group	\N	2026-07-14 14:20:40.81426+07
87bc4ecd-540e-433c-973c-df37e46424e5	SDM	group	\N	2026-07-14 14:20:40.818752+07
872e160d-5ee5-490b-905d-68b76bf36401	Keuangan	group	\N	2026-07-14 14:20:40.822233+07
212062ad-d869-4cba-aa9f-a8a168d824bc	Operasional	group	\N	2026-07-14 14:20:40.825243+07
00ff9d8b-7137-4409-a76e-516686ce9a86	\N	dm	\N	2026-07-14 14:26:07.858409+07
83c55dc7-a922-4f58-b01e-cbbe23a2ff7e	\N	dm	\N	2026-07-14 14:26:09.20102+07
d48a23e1-ce9c-4c2c-95ee-8c6fcb3ff1b2	\N	dm	\N	2026-07-14 14:26:09.661382+07
d5753cfa-f96f-433d-bdd9-02e828bea612	\N	dm	\N	2026-07-14 14:26:10.018878+07
9b10cc59-b120-4ece-ab9f-300cfe43bb94	\N	dm	\N	2026-07-14 14:26:10.356984+07
0c3821c8-4a43-4cb2-bea1-87edf225b344	\N	dm	\N	2026-07-14 14:26:10.693558+07
faa851c7-74c7-4d44-b749-d39294c20dea	\N	dm	\N	2026-07-14 14:26:11.027617+07
587a5755-49f6-426e-974e-398cabae7abc	\N	dm	\N	2026-07-14 15:24:21.482231+07
2d2d2322-4963-4d24-a07b-19f6560afa69	\N	dm	\N	2026-07-14 15:24:22.586825+07
5656052c-7e55-424c-86df-a6794291716d	\N	dm	\N	2026-07-15 20:29:53.272393+07
b4af0110-47e4-4d2a-a4d9-70ae613054a6	\N	dm	\N	2026-07-15 20:29:53.646965+07
1942fed9-20f4-47df-bf5d-8b780e9ddf99	\N	dm	\N	2026-07-15 20:29:54.337216+07
6d4f53bd-06c4-49e6-97ab-e9e6393fa847	\N	dm	\N	2026-07-15 20:29:57.333476+07
caa637a7-bfae-48fb-8b81-e3341f7aee77	\N	dm	\N	2026-07-15 20:29:58.71454+07
d6c41fc2-8164-4ec1-9dca-e32da5ee8913	\N	dm	\N	2026-07-15 20:30:00.41594+07
073d8d06-74cd-40c5-8531-2c4e9b4ccfe8	\N	dm	\N	2026-07-15 20:30:01.313168+07
\.


ALTER TABLE public.rooms ENABLE TRIGGER ALL;

--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.messages DISABLE TRIGGER ALL;

COPY public.messages (id, room_id, sender_id, content, type, file_url, file_name, file_size, created_at, updated_at, is_deleted) FROM stdin;
\.


ALTER TABLE public.messages ENABLE TRIGGER ALL;

--
-- Data for Name: notion_pages; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.notion_pages DISABLE TRIGGER ALL;

COPY public.notion_pages (id, title, content, icon, cover_image, parent_id, is_database, database_view, properties, created_by, created_at, updated_at, access_level, allowed_divisions) FROM stdin;
91080dd1-e6e5-4a3d-9df3-5ad9bc8b77fc	Aturan Kantor	# Aturan & Kebijakan Kantor\n\nBerikut adalah aturan dasar yang berlaku bagi seluruh karyawan:\n\n### Jam Kerja\n- Jam masuk: **08:30 WIB**\n- Jam pulang: **17:30 WIB**\n- Istirahat: **12:00 - 13:00 WIB**\n\n### Pakaian\n- Senin - Kamis: Pakaian formal/rapi.\n- Jumat: Pakaian batik bebas.\n\n### Cuti & Sakit\n- Pengajuan cuti minimal **3 hari** sebelum hari H.\n- Surat keterangan sakit harus diserahkan ke SDM paling lambat **2 hari** setelah masuk kembali.	🏢	linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)	ef87c970-27fa-4432-b79c-7cc138443620	f	table	{}	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:20:40.857554+07	2026-07-14 14:20:40.857554+07	public	\N
0b33a010-924c-482a-9a6a-042fc6cee3d1	Panduan Operasional IT	# Panduan Operasional IT & Keamanan\n\nPanduan ini berisi cara akses jaringan internal dan kebijakan keamanan data perusahaan.\n\n### Koneksi VPN Kantor\nUntuk terhubung ke jaringan internal dari luar kantor, ikuti instruksi berikut:\n```bash\n# Jalankan perintah ini di terminal Anda\nopenconnect vpn.intranet.com --user=username_anda\n```\n\n### Kebijakan Password\n- Minimal **10 karakter**.\n- Harus memuat kombinasi huruf besar, huruf kecil, angka, dan simbol.\n- Ganti password berkala setiap **90 hari**.	💻	linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)	ef87c970-27fa-4432-b79c-7cc138443620	f	table	{}	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:20:40.860238+07	2026-07-14 14:20:40.860238+07	public	\N
c100f793-9555-48b8-bbe5-bfec496baa98	Implementasi Chat System	Menyelesaikan integrasi websocket socket.io untuk fitur obrolan grup dan pesan langsung realtime.	💬	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"status": "Done", "assignee": "marketing", "deadline": "2026-05-20", "priority": "High", "progress": 100, "start_date": "2026-05-18"}	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:20:40.866997+07	2026-07-14 14:20:40.866997+07	public	\N
6057a20f-4ac7-4e99-a91d-a6c23aeb9aeb	Desain Notion Copycat	Merancang tata letak minimalis premium terinspirasi dari aplikasi Notion. Menyertakan side-peek panel dan menu navigasi baru.	🎨	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"status": "In Progress", "assignee": "sdm", "deadline": "2026-05-23", "priority": "High", "progress": 80, "start_date": "2026-05-21"}	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:20:40.873145+07	2026-07-14 14:20:40.873145+07	public	\N
67a3f781-659d-4647-a26e-43e81b20bf4a	Dokumentasi API & Rilis	Menulis panduan integrasi REST API dan Socket.IO untuk programmer backend dan mobile app.	📄	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"status": "To Do", "assignee": "operasional", "deadline": "2026-05-30", "priority": "Low", "progress": 0, "start_date": "2026-05-29"}	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:20:40.881319+07	2026-07-14 14:20:40.881319+07	public	\N
2b676e93-2719-41dd-8a16-6eb162219d65	Papan Tugas & Proyek	Database utama untuk melacak progres tugas tim, tenggat waktu (deadline), penanggung jawab (assignee), dan prioritas proyek.	📅	linear-gradient(120deg, #f6d365 0%, #fda085 100%)	\N	t	board	{}	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:20:40.862993+07	2026-07-15 14:49:20.959843+07	public	\N
08b5783c-5430-4983-82b3-40177f24e08e	Tugas Baru		📄	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"status": "To Do", "assignee": "", "deadline": "2026-07-15", "priority": "Low", "progress": 0, "start_date": "2026-07-15"}	18d7745a-ecd8-405e-acbd-cab110317f2e	2026-07-15 14:36:44.83995+07	2026-07-15 14:36:44.83995+07	public	\N
d552c08b-03be-442b-9596-caac96e72fc6	Pengujian Stabilitas Server		🚀	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"tags": [], "status": "In Progress", "assignee": "", "deadline": "2026-05-28", "priority": "Medium"}	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:20:40.877455+07	2026-07-15 14:52:31.61654+07	public	\N
8399b9bc-85bf-440d-9f85-b07a6217a103	Tugas Baru		📄	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"status": "To Do", "assignee": "", "deadline": "2026-07-15", "priority": "Low", "progress": 0, "start_date": "2026-07-15"}	18d7745a-ecd8-405e-acbd-cab110317f2e	2026-07-15 14:36:48.405781+07	2026-07-15 14:36:48.405781+07	public	\N
bbcd2c30-1ed6-4526-9809-8c303fa8a1df	Tugas Baru		📄	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"status": "To Do", "assignee": "", "deadline": "2026-07-15", "priority": "Low", "progress": 0, "start_date": "2026-07-15"}	18d7745a-ecd8-405e-acbd-cab110317f2e	2026-07-15 14:37:21.630465+07	2026-07-15 14:37:21.630465+07	public	\N
1f2f20cc-b761-4255-ae5b-daa7945ba4fe	Tugas Baru		📄	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"status": "To Do", "assignee": "", "deadline": "2026-07-15", "priority": "Low", "progress": 0, "start_date": "2026-07-15"}	18d7745a-ecd8-405e-acbd-cab110317f2e	2026-07-15 14:41:38.526453+07	2026-07-15 14:41:38.526453+07	public	\N
1b0d6d48-4300-4ed2-a614-07c15bc9c892	Tugas Baru		📄	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"status": "To Do", "assignee": "", "deadline": "2026-07-15", "priority": "Low", "progress": 0, "start_date": "2026-07-15"}	18d7745a-ecd8-405e-acbd-cab110317f2e	2026-07-15 14:46:14.606035+07	2026-07-15 14:46:14.606035+07	public	\N
561bbe94-67a2-434d-892d-dcdfeae9fc20	Testing	Tes	📄	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"tags": [], "status": "To Do", "assignee": "", "deadline": "2026-07-15", "priority": "Low"}	18d7745a-ecd8-405e-acbd-cab110317f2e	2026-07-15 14:49:07.616984+07	2026-07-15 14:49:16.240201+07	public	\N
ef87c970-27fa-4432-b79c-7cc138443620	Dokumentasi Tim	# Dokumentasi & Wiki Internal Tim\n\nSelamat datang di wiki internal tim kami! Di sini Anda dapat menemukan panduan operasional, aturan kantor, dan materi referensi penting lainnya.\n\n### Cara menggunakan Wiki ini:\n1. Klik sub-halaman di bawah untuk melihat rincian.\n2. Klik **Ubah** di kanan atas untuk mengedit konten.\n3. Anda dapat menyematkan gambar, video, atau code block.\n\n---\n*Hubungi Admin jika Anda memiliki pertanyaan.*	📚	linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)	\N	f	table	{}	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:20:40.848801+07	2026-07-15 13:41:57.003012+07	public	\N
97fbd6e8-9a73-4553-8983-aea1bc00af17	Tugas Baru		📄	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"status": "To Do", "assignee": "", "deadline": "2026-07-15", "priority": "Low", "progress": 0, "start_date": "2026-07-15"}	18d7745a-ecd8-405e-acbd-cab110317f2e	2026-07-15 14:36:30.575624+07	2026-07-15 14:36:30.575624+07	public	\N
dd992e0a-ebb7-4f1c-ad44-f869344e41c4	Tugas Baru		📄	\N	2b676e93-2719-41dd-8a16-6eb162219d65	f	table	{"status": "To Do", "assignee": "", "deadline": "2026-07-15", "priority": "Low", "progress": 0, "start_date": "2026-07-15"}	18d7745a-ecd8-405e-acbd-cab110317f2e	2026-07-15 14:36:39.113523+07	2026-07-15 14:36:39.113523+07	public	\N
\.


ALTER TABLE public.notion_pages ENABLE TRIGGER ALL;

--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.projects DISABLE TRIGGER ALL;

COPY public.projects (id, name) FROM stdin;
5	Project PO Marketing
6	Pengadaan Unit Kerja
7	Operasional Kantor
8	Proyek Intranet
\.


ALTER TABLE public.projects ENABLE TRIGGER ALL;

--
-- Data for Name: room_members; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.room_members DISABLE TRIGGER ALL;

COPY public.room_members (room_id, user_id, joined_at) FROM stdin;
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	fac72cd4-06a8-457f-ba5e-8a54b88a211f	2026-07-14 14:23:13.661267+07
212062ad-d869-4cba-aa9f-a8a168d824bc	fac72cd4-06a8-457f-ba5e-8a54b88a211f	2026-07-14 14:23:13.663241+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	02d4fd0e-ff31-4bbb-8e50-4fe4fe1cfc09	2026-07-14 14:23:48.086769+07
212062ad-d869-4cba-aa9f-a8a168d824bc	02d4fd0e-ff31-4bbb-8e50-4fe4fe1cfc09	2026-07-14 14:23:48.090037+07
00ff9d8b-7137-4409-a76e-516686ce9a86	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:26:07.917514+07
83c55dc7-a922-4f58-b01e-cbbe23a2ff7e	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:26:09.207839+07
d48a23e1-ce9c-4c2c-95ee-8c6fcb3ff1b2	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:26:09.66661+07
d48a23e1-ce9c-4c2c-95ee-8c6fcb3ff1b2	a61e6884-b703-42a3-98e8-0af5ca763cc3	2026-07-14 14:26:09.667866+07
d5753cfa-f96f-433d-bdd9-02e828bea612	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:26:10.026426+07
d5753cfa-f96f-433d-bdd9-02e828bea612	086dced1-7f23-4f2d-bd54-26a1c5099767	2026-07-14 14:26:10.028+07
9b10cc59-b120-4ece-ab9f-300cfe43bb94	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:26:10.35987+07
9b10cc59-b120-4ece-ab9f-300cfe43bb94	6fe545d6-2c54-46bd-b554-792bee6f07bb	2026-07-14 14:26:10.360932+07
0c3821c8-4a43-4cb2-bea1-87edf225b344	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:26:10.697739+07
0c3821c8-4a43-4cb2-bea1-87edf225b344	fac72cd4-06a8-457f-ba5e-8a54b88a211f	2026-07-14 14:26:10.699444+07
faa851c7-74c7-4d44-b749-d39294c20dea	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 14:26:11.031463+07
faa851c7-74c7-4d44-b749-d39294c20dea	02d4fd0e-ff31-4bbb-8e50-4fe4fe1cfc09	2026-07-14 14:26:11.033152+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	97a58d10-3a80-43f7-bcb2-a040eee9030e	2026-07-14 14:30:13.254857+07
212062ad-d869-4cba-aa9f-a8a168d824bc	97a58d10-3a80-43f7-bcb2-a040eee9030e	2026-07-14 14:30:13.257615+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	facd612f-e882-4b3e-8ac1-ae23c24092eb	2026-07-14 14:31:05.769874+07
212062ad-d869-4cba-aa9f-a8a168d824bc	facd612f-e882-4b3e-8ac1-ae23c24092eb	2026-07-14 14:31:05.772155+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	3c01363b-acf9-4c78-bb7d-58267b30f595	2026-07-14 14:36:05.319152+07
212062ad-d869-4cba-aa9f-a8a168d824bc	3c01363b-acf9-4c78-bb7d-58267b30f595	2026-07-14 14:36:05.320657+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	18d7745a-ecd8-405e-acbd-cab110317f2e	2026-07-14 14:41:05.401079+07
426f8825-ad49-40d5-8bd3-c220c446326f	18d7745a-ecd8-405e-acbd-cab110317f2e	2026-07-14 14:41:05.406688+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	4b901e83-4a75-41c9-98ed-1ce9438d30b2	2026-07-14 14:41:25.973543+07
426f8825-ad49-40d5-8bd3-c220c446326f	4b901e83-4a75-41c9-98ed-1ce9438d30b2	2026-07-14 14:41:25.984636+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	fa71468a-d40e-42a5-9260-d98cd737e759	2026-07-14 14:41:49.401902+07
426f8825-ad49-40d5-8bd3-c220c446326f	fa71468a-d40e-42a5-9260-d98cd737e759	2026-07-14 14:41:49.404216+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	76c2962d-3ff1-4b6e-83c5-261f19d4604d	2026-07-14 14:42:27.225728+07
426f8825-ad49-40d5-8bd3-c220c446326f	76c2962d-3ff1-4b6e-83c5-261f19d4604d	2026-07-14 14:42:27.237625+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	627f9b17-865d-47a6-be1e-81f10b45b094	2026-07-14 14:43:08.934345+07
426f8825-ad49-40d5-8bd3-c220c446326f	627f9b17-865d-47a6-be1e-81f10b45b094	2026-07-14 14:43:08.945044+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	01d866c2-615a-4bd7-b730-e4592e881ee6	2026-07-14 14:51:14.628263+07
212062ad-d869-4cba-aa9f-a8a168d824bc	01d866c2-615a-4bd7-b730-e4592e881ee6	2026-07-14 14:51:14.639838+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	a873a7b8-fcf1-4716-a626-0839a801fba9	2026-07-14 14:51:15.120583+07
212062ad-d869-4cba-aa9f-a8a168d824bc	a873a7b8-fcf1-4716-a626-0839a801fba9	2026-07-14 14:51:15.123474+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	df396512-3fb0-4fe0-893f-df81efcbb6b0	2026-07-14 15:06:47.866078+07
872e160d-5ee5-490b-905d-68b76bf36401	df396512-3fb0-4fe0-893f-df81efcbb6b0	2026-07-14 15:06:47.870357+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	05f22bed-74c6-41fa-b139-0126f763fde1	2026-07-14 15:07:27.34019+07
872e160d-5ee5-490b-905d-68b76bf36401	05f22bed-74c6-41fa-b139-0126f763fde1	2026-07-14 15:07:27.349514+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	c55d7a15-5fc0-4016-b1ed-2bdc294b3c68	2026-07-14 15:07:57.867301+07
872e160d-5ee5-490b-905d-68b76bf36401	c55d7a15-5fc0-4016-b1ed-2bdc294b3c68	2026-07-14 15:07:57.870463+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	7f6aa9b6-0ba9-4c86-b56c-0b472d4b9caa	2026-07-14 15:08:24.433392+07
872e160d-5ee5-490b-905d-68b76bf36401	7f6aa9b6-0ba9-4c86-b56c-0b472d4b9caa	2026-07-14 15:08:24.436035+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	125775d7-7f89-4620-b162-65067863af8f	2026-07-14 15:09:24.690424+07
872e160d-5ee5-490b-905d-68b76bf36401	125775d7-7f89-4620-b162-65067863af8f	2026-07-14 15:09:24.694785+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	ddbf22ed-0dac-45de-97fd-440562f6eb63	2026-07-14 15:09:41.111874+07
872e160d-5ee5-490b-905d-68b76bf36401	ddbf22ed-0dac-45de-97fd-440562f6eb63	2026-07-14 15:09:41.115682+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	54b3e957-805d-48d9-9d86-3acc7e96b871	2026-07-14 15:12:55.052879+07
872e160d-5ee5-490b-905d-68b76bf36401	54b3e957-805d-48d9-9d86-3acc7e96b871	2026-07-14 15:12:55.05428+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	159b031c-f1e6-4b66-8121-80bee237ec0d	2026-07-14 15:13:24.352953+07
872e160d-5ee5-490b-905d-68b76bf36401	159b031c-f1e6-4b66-8121-80bee237ec0d	2026-07-14 15:13:24.355056+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	a7cb07d3-ba25-4dbd-8019-452be3261a69	2026-07-14 15:14:27.832228+07
426f8825-ad49-40d5-8bd3-c220c446326f	a7cb07d3-ba25-4dbd-8019-452be3261a69	2026-07-14 15:14:27.842326+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	e08c07fc-4e03-45a8-9a96-f76b6f4ef218	2026-07-14 15:15:06.549279+07
87bc4ecd-540e-433c-973c-df37e46424e5	e08c07fc-4e03-45a8-9a96-f76b6f4ef218	2026-07-14 15:15:06.551238+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	82e1b41f-6a13-49f3-a9ef-accc1dcb9f1b	2026-07-14 15:15:29.30034+07
87bc4ecd-540e-433c-973c-df37e46424e5	82e1b41f-6a13-49f3-a9ef-accc1dcb9f1b	2026-07-14 15:15:29.311221+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	189967ba-fb56-4f73-9ccc-5f96fb0f0773	2026-07-14 15:16:11.831496+07
87bc4ecd-540e-433c-973c-df37e46424e5	189967ba-fb56-4f73-9ccc-5f96fb0f0773	2026-07-14 15:16:11.833554+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	91497e52-2c82-42de-b4fc-d357c2b15ea1	2026-07-14 15:16:32.368729+07
87bc4ecd-540e-433c-973c-df37e46424e5	91497e52-2c82-42de-b4fc-d357c2b15ea1	2026-07-14 15:16:32.369994+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	0ab4fb6b-d318-4c70-b5d1-fd7db810008a	2026-07-14 15:16:52.211996+07
87bc4ecd-540e-433c-973c-df37e46424e5	0ab4fb6b-d318-4c70-b5d1-fd7db810008a	2026-07-14 15:16:52.222761+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	a94a8d1f-c6c1-4202-8c3c-8ddb69e0a9c6	2026-07-14 15:17:11.902903+07
87bc4ecd-540e-433c-973c-df37e46424e5	a94a8d1f-c6c1-4202-8c3c-8ddb69e0a9c6	2026-07-14 15:17:11.914123+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	1c901f39-a59b-4432-ab10-3fd404c047d8	2026-07-14 15:17:28.302095+07
87bc4ecd-540e-433c-973c-df37e46424e5	1c901f39-a59b-4432-ab10-3fd404c047d8	2026-07-14 15:17:28.303204+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	354bdf45-122a-4cd6-95f8-818b61e813bc	2026-07-14 15:17:48.051332+07
87bc4ecd-540e-433c-973c-df37e46424e5	354bdf45-122a-4cd6-95f8-818b61e813bc	2026-07-14 15:17:48.061663+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	258a3115-0523-4b73-acb2-9f37d403d4c5	2026-07-14 15:18:21.379077+07
87bc4ecd-540e-433c-973c-df37e46424e5	258a3115-0523-4b73-acb2-9f37d403d4c5	2026-07-14 15:18:21.390592+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	a5650797-bd92-4bb6-bdcb-1f2cd5cb0d4c	2026-07-14 15:18:51.615517+07
87bc4ecd-540e-433c-973c-df37e46424e5	a5650797-bd92-4bb6-bdcb-1f2cd5cb0d4c	2026-07-14 15:18:51.626363+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	9982cb9d-4872-4769-9316-63a9e4e61207	2026-07-14 15:23:19.449296+07
212062ad-d869-4cba-aa9f-a8a168d824bc	9982cb9d-4872-4769-9316-63a9e4e61207	2026-07-14 15:23:19.460608+07
587a5755-49f6-426e-974e-398cabae7abc	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 15:24:21.489499+07
587a5755-49f6-426e-974e-398cabae7abc	0ab4fb6b-d318-4c70-b5d1-fd7db810008a	2026-07-14 15:24:21.490671+07
2d2d2322-4963-4d24-a07b-19f6560afa69	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-14 15:24:22.601554+07
2d2d2322-4963-4d24-a07b-19f6560afa69	76c2962d-3ff1-4b6e-83c5-261f19d4604d	2026-07-14 15:24:22.602689+07
5656052c-7e55-424c-86df-a6794291716d	1c901f39-a59b-4432-ab10-3fd404c047d8	2026-07-15 20:29:53.30151+07
5656052c-7e55-424c-86df-a6794291716d	9982cb9d-4872-4769-9316-63a9e4e61207	2026-07-15 20:29:53.304597+07
b4af0110-47e4-4d2a-a4d9-70ae613054a6	1c901f39-a59b-4432-ab10-3fd404c047d8	2026-07-15 20:29:53.650407+07
b4af0110-47e4-4d2a-a4d9-70ae613054a6	fac72cd4-06a8-457f-ba5e-8a54b88a211f	2026-07-15 20:29:53.662444+07
1942fed9-20f4-47df-bf5d-8b780e9ddf99	1c901f39-a59b-4432-ab10-3fd404c047d8	2026-07-15 20:29:54.341586+07
1942fed9-20f4-47df-bf5d-8b780e9ddf99	02d4fd0e-ff31-4bbb-8e50-4fe4fe1cfc09	2026-07-15 20:29:54.351798+07
6d4f53bd-06c4-49e6-97ab-e9e6393fa847	1c901f39-a59b-4432-ab10-3fd404c047d8	2026-07-15 20:29:57.338096+07
6d4f53bd-06c4-49e6-97ab-e9e6393fa847	54b3e957-805d-48d9-9d86-3acc7e96b871	2026-07-15 20:29:57.350761+07
caa637a7-bfae-48fb-8b81-e3341f7aee77	1c901f39-a59b-4432-ab10-3fd404c047d8	2026-07-15 20:29:58.717613+07
caa637a7-bfae-48fb-8b81-e3341f7aee77	0ab4fb6b-d318-4c70-b5d1-fd7db810008a	2026-07-15 20:29:58.718444+07
d6c41fc2-8164-4ec1-9dca-e32da5ee8913	1c901f39-a59b-4432-ab10-3fd404c047d8	2026-07-15 20:30:00.420331+07
d6c41fc2-8164-4ec1-9dca-e32da5ee8913	bcedcb09-5313-4c50-a806-7ce2341b38f5	2026-07-15 20:30:00.422234+07
073d8d06-74cd-40c5-8531-2c4e9b4ccfe8	1c901f39-a59b-4432-ab10-3fd404c047d8	2026-07-15 20:30:01.327694+07
073d8d06-74cd-40c5-8531-2c4e9b4ccfe8	76c2962d-3ff1-4b6e-83c5-261f19d4604d	2026-07-15 20:30:01.338954+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	d04af276-8fa1-44f1-9d6a-c6ee58d95a77	2026-07-15 20:40:49.030343+07
212062ad-d869-4cba-aa9f-a8a168d824bc	d04af276-8fa1-44f1-9d6a-c6ee58d95a77	2026-07-15 20:40:49.031871+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	3168c16a-9c92-498f-bfa9-71a0706b946c	2026-07-15 20:41:17.271594+07
212062ad-d869-4cba-aa9f-a8a168d824bc	3168c16a-9c92-498f-bfa9-71a0706b946c	2026-07-15 20:41:17.272114+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	ed1a0f56-6f70-4ea8-9111-f1656d5150c0	2026-07-15 20:41:43.771867+07
212062ad-d869-4cba-aa9f-a8a168d824bc	ed1a0f56-6f70-4ea8-9111-f1656d5150c0	2026-07-15 20:41:43.782603+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	5e9445bc-dca1-49f4-9158-87b8b3da1d9b	2026-07-15 20:42:01.572859+07
212062ad-d869-4cba-aa9f-a8a168d824bc	5e9445bc-dca1-49f4-9158-87b8b3da1d9b	2026-07-15 20:42:01.583513+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	ba3bd465-1674-416c-a0b4-e71c149edc92	2026-07-15 20:42:20.651102+07
212062ad-d869-4cba-aa9f-a8a168d824bc	ba3bd465-1674-416c-a0b4-e71c149edc92	2026-07-15 20:42:20.653155+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	0eb084a6-237b-43f2-9848-d9567aac91a7	2026-07-15 20:45:07.123845+07
212062ad-d869-4cba-aa9f-a8a168d824bc	0eb084a6-237b-43f2-9848-d9567aac91a7	2026-07-15 20:45:07.135302+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	a4ce8f0d-8b00-44d0-bd8c-53971dd6c3bd	2026-07-15 20:46:35.488766+07
212062ad-d869-4cba-aa9f-a8a168d824bc	a4ce8f0d-8b00-44d0-bd8c-53971dd6c3bd	2026-07-15 20:46:35.490577+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	19e341af-bc64-462d-84d5-2fd240ca5033	2026-07-15 20:47:02.935654+07
426f8825-ad49-40d5-8bd3-c220c446326f	19e341af-bc64-462d-84d5-2fd240ca5033	2026-07-15 20:47:02.946612+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	8e52c0f7-7832-49c6-a4a1-c445fe31d363	2026-07-15 20:48:19.872688+07
212062ad-d869-4cba-aa9f-a8a168d824bc	8e52c0f7-7832-49c6-a4a1-c445fe31d363	2026-07-15 20:48:19.874111+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	ad671fc0-194b-459c-a095-88ba46057935	2026-07-15 20:48:37.198786+07
212062ad-d869-4cba-aa9f-a8a168d824bc	ad671fc0-194b-459c-a095-88ba46057935	2026-07-15 20:48:37.209522+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	87e8c72e-6bcf-406b-a273-458abf133e96	2026-07-15 20:48:56.194527+07
212062ad-d869-4cba-aa9f-a8a168d824bc	87e8c72e-6bcf-406b-a273-458abf133e96	2026-07-15 20:48:56.195177+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	dd94603b-0eff-4a54-bc23-3fe1629ec663	2026-07-15 20:49:20.475636+07
212062ad-d869-4cba-aa9f-a8a168d824bc	dd94603b-0eff-4a54-bc23-3fe1629ec663	2026-07-15 20:49:20.476719+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	456b3080-5c8c-40a5-af26-0388d9735563	2026-07-15 20:50:18.001073+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	70b48927-30cb-4140-90f7-2eb2a14acca4	2026-07-15 20:51:18.808024+07
fa594c6c-0e9a-41e0-b1c9-036d6bee6c5f	9f72f61e-bd5d-42cf-9544-44841ffc0b56	2026-07-15 20:51:46.126438+07
\.


ALTER TABLE public.room_members ENABLE TRIGGER ALL;

--
-- Name: document_views_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.document_views_id_seq', 9, true);


--
-- Name: kode_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kode_id_seq', 4671, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.projects_id_seq', 8, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 0icXRdzVzhIeTP6nBus8tHaWNBxKodfDheWAaMd5JHTUxWb3ArlY40ijnF8bh3T

