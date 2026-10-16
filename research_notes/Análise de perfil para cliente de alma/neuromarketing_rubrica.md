# Neuromarketing, neurosales & consumer psychology: frameworks to turn into an LLM rubric for "cliente de alma" profile analysis

Scope note for the report writer: I ran 14 searches (no full-text fetches) in this session. Items marked **[source]** are backed by the cited URL. Items marked **[background, not verified this session]** come from general domain knowledge. Treat them as leads to check, not as citable facts. Evidence grades: **strong** (meta-analyses or multiple well-powered and/or field replications), **moderate** (several peer-reviewed studies, some disputes), **weak** (few or contested studies, mostly survey or self-report), **folklore** (practitioner framework with no empirical validation, or a premise that has been refuted).

Local context found in the repo's skills: "Cliente de Alma" is a required field in the user's own methodology. That is the "Briefing de Transição da Identidade para a Estratégia" (identidade escolhida, propósito operacional, Cliente de Alma, mecanismo único, limites inegociáveis), in skill `conselho-clevel-jogo-da-vida`. The consultant skill `consultor-vendas-conscientes` attributes the methodology to Elvis Pimentel / Instituto Galifriel. It describes the method as "engenharia de identidade comercial, Erickson, SPIN Selling", where selling is "consequência de clareza e presença — não de pressão ou manipulação". In skill `youtube-podcast-para-video-galifrael`, the cliente de alma of the "Aqui Agora PodPoc" responds to a real face plus a contrast between two worlds, and to concrete visual references they can research on their own. These are local files (/root/.claude/skills/synced/.../SKILL.md), not web sources. They suggest the rubric's "match" target should be a written Cliente de Alma profile that the creator supplies.

## 1. Which frameworks are evidence-based vs. pop-science?

### Takeaway
Only a few of the popular frameworks have real empirical support for scoring creator content:
- arousal-driven sharing (Berger & Milkman)
- personality-congruent message tailoring (Matz et al.), with caveats
- processing fluency
- concrete language
- social proof/authority as persuasion levers, though with weak effect-size evidence
The "reptilian/triune brain" premise behind SalesBrain/NeuroMap is refuted. Archetypes, StoryBrand, the Schwartz awareness levels and the Hook Model are useful *heuristic* labels for an LLM, but they should be graded weak or folklore as predictors of outcomes.

### Cited Findings
**Psychological targeting / Big Five (Matz et al. 2017, PNAS): moderate, contested.**
- The paper argues that matching persuasive appeals to large groups' psychological traits (from Facebook Likes) changes behavior. The authors themselves warn that it can be used to covertly exploit weaknesses in people's character. — [Matz et al. 2017, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5715760); [Columbia PDF](https://drupalgsb-test.paas.cc.columbia.edu/sites/default/files-efs/pubfiles/25553/Matz_Psychological%20Targeting.pdf)
- Critique 1: Sharp, Danenberg & Bellman (2018, PNAS letter) argue that two of the three studies compared targeted ads with deliberately *mistargeted* ads rather than with standard untargeted ads. That is a weaker test, and they say the results do not show targeting beats normal advertising. — [Sharp et al. letter, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6112715); authors' reply: [Cambridge repository](https://www.repository.cam.ac.uk/handle/1810/285373)
- Critique 2: Eckles, Gordon & Johnson (2018, PNAS letter) say the field studies face threats to internal validity, plausibly from Facebook's delivery optimization. Matz et al. replied that the optimization algorithms are "highly unlikely" to explain the effects. — [Kellogg page for Eckles et al.](https://www.kellogg.northwestern.edu/academics-research/research/detail/2018/field-studies-of-psychologically-targeted-ads-face-threats-to); [PMC letter](https://pmc.ncbi.nlm.nih.gov/articles/PMC6112709)
- Update: Matz et al. 2024 (*Scientific Reports*, 4 studies / 7 sub-studies, N = 1,788). ChatGPT-tailored messages beat non-tailored ones across personality, political ideology and moral foundations, even with a single short prompt. — [PMC10897294](https://pmc.ncbi.nlm.nih.gov/articles/PMC10897294); [Stanford MAP lab](https://maplab.stanford.edu/publications/potential-generative-ai-personalized-persuasion-scale)
- Kellogg Insight reports that tailored messages were especially persuasive for *experiences* rather than products. This is relevant to mentoring and courses. — [Kellogg Insight](https://insight.kellogg.northwestern.edu/article/gen-ai-can-tailor-ads-to-our-personalities-and-theyre-pretty-persuasive)

**Virality / high-arousal emotion (Berger & Milkman, JMR 2012): strong.**
- They analyzed about 7,000 NYT articles plus lab experiments. High-arousal emotions (awe, anger, anxiety) increase sharing, while sadness (low arousal) decreases it. Positive content is shared more overall, but arousal matters beyond valence. The effects held when controlling for surprise, interest and usefulness. — [Berger & Milkman PDF, Wharton](https://faculty.wharton.upenn.edu/wp-content/uploads/2011/11/Virality.pdf); [Scientific American summary](https://www.scientificamerican.com/article/the-secret-to-online-success-what-makes-content-go-viral)

**Processing / cognitive fluency (Reber, Schwarz & Winkielman 2004, PSPR): strong for the general effect, moderate for the mechanism.**
- The paper argues that fluent processing is experienced as positive and underlies aesthetic pleasure. Related work links fluency to judged truth (Reber & Schwarz 1999; Unkelbach). — [Reber et al. 2004 PDF, BORA](https://bora.uib.no/bora-xmlui/bitstream/handle/1956/594/BORA_PSPR04.pdf?sequence=1); [Unkelbach et al. 2011 PDF](https://methexp.uni-koeln.de/files/Unkelbach-Bayer-Alves-Koch-Stahl-2011.pdf); [Schwarz, Daedalus](https://www.amacad.org/publication/judgments-truth-beauty)
- Caveat: Forster et al. find that the *subjective feeling* of fluency predicts liking better than objective fluency does. — [Univ. Vienna](https://aesthetics.univie.ac.at/publications/details/pure/e10fd32f-1c29-4328-907f-cb65fe9cc79b/show/publ/Pure)

**Cialdini's principles: strong as a qualitative taxonomy, weak/uncertain for effect sizes.**
- I found no meta-analysis that pools effect sizes across the principles. A scenario survey (N = 642, UK/Arab) found social proof and authority most influential and scarcity least influential, though still significant. — [HBKU study](https://elmi.hbku.edu.qa/en/publications/do-cialdinis-persuasion-principles-still-influence-trust-and-risk/)
- Scarcity-*priming* research (a different construct from scarcity as a sales tactic) showed mixed replicability in a preregistered many-study replication: "some strong successes and other undeniable failures". — [PMC8612349](https://pmc.ncbi.nlm.nih.gov/articles/PMC8612349)

**Triune / "reptilian" brain; SalesBrain NeuroMap (Renvoisé & Morin): folklore premise, though some of the copy heuristics are reasonable.**
- The triune brain model (MacLean, popularized by Sagan in 1977) "is now regarded as a myth" in evolutionary and developmental neuroscience. — [Wikipedia: Triune brain](https://en.wikipedia.org/wiki/Triune_brain); [ScienceNorway](https://sciencenorway.no/brain/no-you-dont-have-a-reptilian-brain-inside-your-brain/2201926); [BBC Science Focus](https://www.sciencefocus.com/the-human-body/the-lizard-brain-lie)
- Lisa Feldman Barrett: "The brain is not a battlefield between reason and emotion." Cesario et al.: "Your brain is not an onion with a tiny reptile inside" (seen only through a secondary event listing). — [ScienceNorway](https://sciencenorway.no/brain/no-you-dont-have-a-reptilian-brain-inside-your-brain/2201926); [event listing](https://theflourishingcenter.com/events/debunking-the-triune-brain-theory-myth-with-dr-joseph-cesario/)
- SalesBrain's 2007 *Neuromarketing: Understanding the Buy Buttons* casts the reptilian brain as the true decision-maker. Neuroscience Marketing (Dooley) calls this premise outdated. — [NeuroscienceMarketing](https://www.neurosciencemarketing.com/?p=15030)
- The "buy button" claim is criticized as reverse inference: brain regions rarely map one-to-one onto mental states. — [iMotions](https://imotions.com/blog/insights/research-insights/buy-button/); [BPS Research Digest](https://bps.org.uk/research-digest/can-brain-activity-predict-chocolate-sales-search-buy-button)
- Leading researchers now separate academic "consumer neuroscience" from commercial "neuromarketing". — [Econsultancy](https://econsultancy.com/neuromarketing-is-dead-long-live-neuromarketing/)

**Brand archetypes (Mark & Pearson 2001, Jungian): weak.**
- A survey in Portugal, Brazil, Colombia and Peru (n = 537) found that consumers' word associations with brands roughly match archetype predictions, but perceptions varied a lot between countries. — [Xara-Brasil et al. 2018, REGE/USP](https://revistas.usp.br/rege/article/view/147500)
- A 2021 UW dissertation tested the 12-archetype model and proposed regrouping it into 4 clusters, which suggests the original 12 are not cleanly separable. — [UW dissertation](https://digital.lib.washington.edu/researchworks/bitstreams/4d33b25a-2369-446b-9147-3957e3ff0eb3/download)
- Mark & Pearson's claim that strongly archetyped brands' Market Value Added rose 97% more (BAV data, 1993–99) is secondhand and unverified. — [Researchscape](https://researchscape.com/?p=295)

### Inferences
Proposed grade table. Grades marked "bg" are background knowledge, not verified this session.

| Framework | Grade | Use in rubric |
|---|---|---|
| Berger & Milkman arousal | strong | Score the emotional arousal of hooks and captions |
| Processing fluency | strong | Score readability, visual clarity and consistency of bio and grid |
| Concrete language (Packard & Berger) | moderate–strong | Score specificity of the promise, CTA and bio |
| Personality-congruent tailoring (Matz) | moderate (contested) | Score fit between profile language and the client's psychographics |
| Cialdini (social proof, authority, liking, reciprocity, commitment, unity, scarcity) | moderate as levers; weak for magnitudes | Check presence and *authenticity* of each lever; flag fake scarcity |
| Parasocial bond | moderate, context-dependent | Score self-disclosure, direct address, face presence and consistency |
| Kahneman System 1/2 | moderate as a dual-process idea (bg); "priming" sub-literature weak after replication failures (bg) | Use only as a design lens (fast first impression vs. considered proof) |
| Jobs-to-be-Done (Christensen/Ulwick) | weak academically, strong in practice (bg) | Is the "job" or progress the client wants named explicitly? |
| Schwartz awareness levels (*Breakthrough Advertising*, 1966) | folklore/practitioner (bg) | Classify each post's target awareness stage; check funnel coverage |
| StoryBrand (Miller) | folklore/practitioner (bg); narrative transportation research behind storytelling is moderate (bg) | Is the client the hero and the creator the guide? Is there a plan and a CTA? |
| Archetypes | weak | A consistency check only, not a predictor |
| ZMET (Zaltman) | moderate as a qualitative research method; patented (bg) | Not automatable from a profile; use metaphor mining in voice-of-customer data instead |
| Hook Model (Eyal) | folklore for content (a product-design heuristic) (bg) | Low priority; maybe "is there a recurring ritual or series?" |
| SalesBrain / NeuroMap, "reptilian brain" | folklore premise | Do not cite as science. Some prescriptions (contrast, tangible claims, beginning and end) overlap with fluency and concreteness evidence |

For a "vendas conscientes" brand, the rubric should *reward* authentic social proof and authority and *penalize* manufactured urgency. That fits both the mentor's stated philosophy and the ethics findings in section 5.

### Gaps
- I did not fetch primary sources for Kahneman, JTBD, StoryBrand, Schwartz, ZMET or the Hook Model this session. Their grades are background judgement.
- I found no pooled meta-analysis of Cialdini principles as compliance tactics.
- I did not retrieve the Rutten/Thurley neuromarketing critique.
- I found no empirical study validating StoryBrand or the Schwartz awareness levels.

## 2. Psycholinguistic signals measurable from text (LIWC, concreteness, self-reference, valence/arousal, readability), sharing, trust and parasocial bonds

### Takeaway
Several text signals are well grounded: concreteness, emotional arousal and valence, and fluency/readability. An LLM can score them, ideally cross-checked with lexicon tools (LIWC-22, concreteness norms, NRC VAD). Parasocial bonds affect purchase intention, but the effect depends on context and probably works through credibility and trust.

### Cited Findings
- **Concreteness:** Packard & Berger (JCR 2021; 5 studies, more than 1,000 real interactions, 3 experiments with n = 1,102) found that customers were more satisfied, more willing to buy, and bought more when employees used concrete language. The mechanism is that concreteness signals listening. — [Wharton Knowledge](https://knowledge.wharton.upenn.edu/article/how-language-boosts-customer-satisfaction/); [YFile, York U](https://yfile.news.yorku.ca/?p=284102); [IPR summary](https://instituteforpr.org/packard-berger-concrete-vs-abstract-lang)
  - Secondary sources report that +1 SD of concreteness was linked to about 9% higher satisfaction. Verify this against the paper before citing. — [IPR summary](https://instituteforpr.org/packard-berger-concrete-vs-abstract-lang)
- **Arousal and valence → sharing:** see Berger & Milkman above. — [Wharton PDF](https://faculty.wharton.upenn.edu/wp-content/uploads/2011/11/Virality.pdf)
- **Parasocial engagement:** Tyrväinen & Karjaluoto (2025, *IJIM*) ran a meta-analysis of 117 studies (N = 47,647) plus 25 interviews. They found that the effect of parasocial engagement on purchase intention depends on product involvement, purchase frequency and content type (picture vs. video). — [JYX repository](https://jyx.jyu.fi/handle/123456789/97674)
- Contrary evidence: in a hospitality PLS study, parasocial relationship → eWOM was positive, but the direct path to purchase intention was not significant. The path ran through credibility → brand trust. — [Researcher.life summary](https://discovery.researcher.life/article/an-integrated-systematic-review-and-bibliometric-analysis-of-parasocial-interaction-from-social-media-influencers-perspective-in-the-hospitality-industry/15363ac2556c3f1ab7ee5f9e56ac29e5)
- A small survey (N = 137, master's thesis) found that source credibility raises both purchase intention and the parasocial relationship. Weak evidence. — [AAU thesis](https://projekter.aau.dk/projekter/files/414944782/Master_s_Thesis___The_Effect_of_Influencer_Marketing.pdf)
- **Fluency → liking and truth:** see Reber et al. above. — [BORA PDF](https://bora.uib.no/bora-xmlui/bitstream/handle/1956/594/BORA_PSPR04.pdf?sequence=1)

### Inferences
Candidate measurable criteria. In each, the LLM scores 0–3 and must quote the evidence span.

1. **Concreteness of promise:** does the bio or pinned post name a specific outcome, audience, timeframe or mechanism rather than abstractions like "transformação" or "propósito"? Cross-check with Brysbaert-style concreteness norms (a Portuguese adaptation is needed).
2. **Arousal profile of hooks:** classify the first line or first 3 seconds of each post by emotion (awe, curiosity/surprise, anger, anxiety, sadness, contentment) and arousal level. Report the distribution and flag excess fear or anger relative to the "consciente" positioning.
3. **Fluency:** sentence length, jargon density, Portuguese readability (a Flesch adaptation for PT-BR exists), visual consistency of the grid and highlight covers.
4. **Client-focus ratio:** second-person pronouns ("você") vs. first-person ("eu") in captions, an LIWC-style count. Interpret this alongside self-disclosure. Some self-disclosure feeds the parasocial bond, so neither extreme is ideal.
5. **Parasocial cues:** face on camera, direct address, consistent posting persona, replies to comments, behind-the-scenes content.
6. **Credibility and authority evidence:** verifiable proof (cases, numbers, named results), not just claims. Per the hospitality and thesis evidence, credibility is the likely channel to purchase.
7. **CTA clarity:** one explicit next step per post or bio. This is a fluency plus concreteness proxy, and the item is an inference.

LLM-as-judge reliability: use anchored rubrics with examples, multiple samples or majority vote, and calibrate against human ratings on 30–50 profiles. This is general LLM-eval practice, not sourced here.

### Gaps
- I did not verify current LIWC-22 Portuguese dictionary availability or Portuguese concreteness and VAD norms.
- I found no peer-reviewed study tying Instagram *bio* features specifically to conversion.
- I found no study on "highlights" (Instagram Stories Highlights) effects.

## 3. Inferring the ideal client's psychographics from comments/DMs/questions (voice of customer) and matching profile language

### Takeaway
The strongest available evidence for "match" scoring is the psychological-targeting literature. Language congruent with the audience's traits and values outperforms non-congruent language, including when an LLM generates it (Matz 2024). This gives a defensible basis to (a) mine voice-of-customer text for the client's own words, pains, desired progress and values, and (b) score the profile's lexical and semantic overlap with them. Inferring individual personality is where the ethical and legal risk sits (section 5).

### Cited Findings
- Tailoring by personality, ideology or moral foundations, generated by ChatGPT from one prompt, beat generic messages (N = 1,788). — [PMC10897294](https://pmc.ncbi.nlm.nih.gov/articles/PMC10897294)
- Digital footprints (Facebook Likes) can be used to infer traits and target groups. The authors flag a covert-exploitation risk. — [Matz et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5715760)
- Concrete language works because it signals "I listened". This suggests that echoing the client's specific words is itself persuasive. — [Wharton Knowledge](https://knowledge.wharton.upenn.edu/article/how-language-boosts-customer-satisfaction/)
- In the user's own method, the cliente de alma reacts to concrete references they can look up, and to real faces with a contrast between worlds. That is a creator-specific VoC hypothesis to test. — local skill file `youtube-podcast-para-video-galifrael/SKILL.md` (not a web source)

### Inferences
Suggested pipeline:
1. Collect comments, DM questions and sales-call notes, anonymized and aggregated.
2. Have the LLM extract recurring **pains**, **desired progress** (the JTBD "job"), **objections**, **exact phrases**, **metaphors** (a ZMET-inspired idea, not ZMET itself) and **values or moral-foundations cues**.
3. Build a "Cliente de Alma language card" that the creator validates.
4. Score the profile:
   - % of the client's top phrases or themes present in the bio, highlights and recent hooks
   - semantic similarity of the profile with the VoC corpus (embeddings)
   - whether each awareness stage the client is at is addressed
   - tone congruence: for example, a reflective, research-oriented audience should get evidence and references rather than hype
5. Work at the **segment / persona level** and never label individual commenters with personality or sensitive traits.

Rubric output: a match score per element (bio, highlights, top 9 posts, CTAs) plus "gaps" (client words never used) and "noise" (profile themes the client never mentions).

### Gaps
- I found no validated study on LLM inference of psychographics from *creator-audience comments* specifically.
- I found no published accuracy figures for LLM Big Five inference from short PT-BR text in this session.
- I found no source for a specific "cliente de alma" methodology on the web. The term appears to be proprietary to the user's mentor/method, and searches returned nothing.

## 4. Brazilian references (Pedro Camargo, Pedro Superti, Rafael Rez) and mappable methods

### Takeaway
Pedro Camargo is the clearest Brazilian academic-adjacent neuromarketing author. His framing ("biologia do comportamento do consumidor": hormones, circadian rhythm, microbiota) is broad and popular-science leaning, so grade it weak to folklore for rubric criteria, apart from timing ideas. I could not retrieve sources on Pedro Superti's or Rafael Rez's methods in this session. "Cliente de alma" did not appear on the open web.

### Cited Findings
- Pedro Camargo teaches Neurovendas in FGV's Neurobusiness program, coordinates Neurogestão courses at ISAE, and has written five books on neuromarketing and consumer-behavior biology. — [Unifor](https://unifor.br/web/pos-graduacao/-/escola-de-comunicacao-da-pos-unifor-recebe-pedro-camargo-para-ministrar-palestra)
- His books:
  - *A Hora Certa de Vender é Quando o Cérebro Quer Comprar* (Astral Cultural, 2020) covers the brain, digestive system and microbiota, immune, endocrine and circadian systems. — [Martins Fontes](https://www.martinsfontespaulista.com.br/cronobiologia-da-venda-912443/p)
  - *Neuromarketing: A Nova Pesquisa de Comportamento do Consumidor* (Atlas). — [Buscapé](https://www.buscape.com.br/livros/neuromarketing-a-nova-pesquisa-de-comportamneto-do-consumidor-de-camargo-pedro-9788522474844)
  - *Eu Compro, Sim! Mas a Culpa é dos Hormônios* (2013). — [Skoob](https://www.skoob.com.br/book/375370); [UAI](https://www.uai.com.br/app/noticia/saude/2013/09/04/noticias-saude,193927/amp.html)
- Searches for "Pedro Superti 'cliente de alma'" and "Superti 'Ouse ser diferente' método" returned no relevant results. — (no source; search failure noted)

### Inferences
- From Camargo's chronobiology, a possible low-weight criterion is "posting time vs. audience activity". Check it against the creator's own Instagram Insights rather than biological theory.
- The background-knowledge items below are not verified this session:
  - Pedro Superti is known for "diferenciação" / *Ouse Ser Diferente* and for the concept of a "público apaixonado" or "cliente apaixonado" (soul-client-like). Mappable criteria would be "a clear enemy or contrast stated", "a unique-mechanism name" and "a polarizing positioning that repels non-ideal clients". These are practitioner ideas, so grade them folklore or weak.
  - Rafael Rez (*Marketing de Conteúdo: a moeda do século XXI*, Nova Escola de Marketing) teaches persona-based content marketing and funnel stages. Mappable criteria would be "content mapped to funnel stage" and "clear persona". Practitioner, weak.

### Gaps
- No verified sources for Superti's or Rez's methods.
- No Brazilian peer-reviewed validation of neurovendas frameworks found.
- Wider Brazilian academic literature (e.g., ANPAD/EnANPAD, REGE) was not searched, except for the archetype study (REGE/USP, with Brazilian participants).

## 5. Ethics and legal limits (LGPD, Meta/TikTok policies, manipulation/dark patterns, Cambridge Analytica lesson)

### Takeaway
Analyzing the *creator's own* public profile is low-risk. Mining audience comments and DMs to infer psychographics is personal-data processing under the LGPD. It needs a legal basis, transparency and minimization. Inferring sensitive traits (religion, health, sexuality and the like, which are common in spiritual or "alma" niches) and covert personality targeting are the high-risk zones. Meta's ad policies also forbid copy that asserts or implies the reader's personal attributes. This matters because the "speak directly to the soul client" style often produces copy like "Você que é espiritualizada…".

### Cited Findings
- The ANPD has stated that data used to form behavioral profiles is personal data subject to the LGPD. That includes the right to review automated decisions (art. 20) and protection against unlawful discrimination. — [Teletime](https://teletime.com.br/21/07/2023/anpd-protecao-dados-nao-deve-ser-regulada-em-nova-lei-de-plataformas-digitais/)
- A legal basis, transparent privacy notices and the art. 20 review right apply to profiling. — [Conjur](https://www.conjur.com.br/?p=359586)
- The ANPD's analysis of PL 2630 discusses transparency on ad-targeting parameters. Check the bill's current status. — [ANPD PDF](https://www.gov.br/anpd/pt-br/assuntos/noticias/AnlisepreliminardoProjetodeLein2630.pdf)
- IAB Brasil commissioned a legal opinion on LGPD and personalized advertising (Marcel Leonardi). This is an industry-friendly source. — [IAB Brasil PDF](https://iabbrasil.com.br/wp-content/uploads/2021/08/IAB-BRASIL_PARECER-JURIDICO_LGPD-E-PUBLICIDADE-PERSONALIZADA_MARCEL-LEONARDI.pdf)
- **Meta ad policy:** ads must not assert or imply personal attributes (race, religion, age, sexual orientation, health, criminal record, financial status and others), directly or indirectly, and must not imply the advertiser knows them. Examples of disallowed copy include "Are you Christian?" and "Date Christian singles!". — [Meta Transparency Center](https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/)
- Practitioner guides say the trigger is the *copy wording*, not the audience settings. — [Stackmatix](https://www.stackmatix.com/blog/meta-ads-personal-attributes-policy)
- Matz et al. themselves warn that psychological targeting can covertly exploit character weaknesses. — [PMC5715760](https://pmc.ncbi.nlm.nih.gov/articles/PMC5715760)

### Inferences
Guardrails for the rubric and tool:
- (a) Analyze the creator's content plus *aggregated, anonymized* VoC. Never store per-follower psychological profiles.
- (b) Exclude LGPD sensitive-data categories (art. 5 II: religious belief, health, sex life, political opinion and others) from any inference. This is critical in a spirituality niche.
- (c) Add an "ethical persuasion" sub-score that penalizes fake scarcity or countdowns, fear-based hooks without resolution, unverifiable claims, and the second-person attribute assertions Meta prohibits for ads.
- (d) Disclose that the analysis is AI-assisted and keep a human in the loop for decisions.
- (e) The Cambridge Analytica lesson: covert, trait-based targeting harvested without consent caused both legal and reputational harm. Group-level, consented, transparent use is the defensible pattern. The Cambridge Analytica facts are background knowledge, not sourced this session.

### Gaps
- I did not find a specific ANPD guide on behavioral advertising or social-media profiling. ANPD regulation on AI or high-risk processing as of October 2026 was not verified.
- TikTok's advertising and profiling policies were not retrieved.
- I did not verify Brazilian consumer law (CDC art. 37, abusive advertising) or CONAR rules on influencer ad disclosure (Guia de Publicidade por Influenciadores Digitais). They are likely relevant to the rubric's "transparency" criterion.
- The EU AI Act's prohibition on manipulative AI techniques (art. 5) was not verified here. It is relevant only if there are EU users.
