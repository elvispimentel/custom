# Open-source repos and tools for social profile analysis against a goal (GitHub / Hugging Face), as of October 2026

Method note: the GitHub API was blocked in this session (403, the session is bound to its configured repos), so star counts, licenses and dates below come from fetched GitHub pages or third-party roundups. Where a page did not show a last-commit date, it says so. Nothing in this file was invented. Unverified items are listed under Gaps.

## 1. Which repos do profile audit or scoring against a goal?

### Takeaway
No mature, maintained open-source repo audits a social profile against a stated business goal such as "attract high-ticket mentorship clients". The most reusable building blocks are agent skill packs: ScrapeCreators `creator-profile-teardown` / `audience-research` (MIT, about 3.8k stars) and borghei's `social-media-analyzer` (Python, but MIT + Commons Clause). Small Python audit apps exist but have almost no traction. The "against a goal" layer will have to be a custom LLM rubric added to the client's existing Python pipeline.

### Cited Findings
- **ScrapeCreators/social-media-research-skills**
  - About 3.8k stars, MIT license, only 7 commits, and the page shows no commit date.
  - It has 12 skills: `creator-profile-teardown` ("why a creator/brand account works": positioning, content pillars, outliers, playbook), `audience-research` (audience-fit report with confidence labels), `competitor-social-research`, `outlier-post-finder`, `comment-mining` (audience questions, objections, language), `transcript-intelligence`, `trend-discovery`, `influencer-prospecting` (fit scores), `ad-library-teardown`, `social-listening-brief`, `product-demand-research` and `content-repurposing`.
  - It needs a paid `SCRAPECREATORS_API_KEY`, covers public data only, and spans TikTok, Instagram, YouTube, LinkedIn, Threads and others. Install with `npx skills add ScrapeCreators/social-media-research-skills`.
  - It has no explicit persona or ICP skill.
  - [GitHub](https://github.com/ScrapeCreators/social-media-research-skills)
- **borghei/Claude-Skills, `marketing/social-media-analyzer`**
  - Ships Python scripts `calculate_metrics.py` and `analyze_performance.py` that compute engagement, CTR and ROI, compare against platform benchmarks, rank top and bottom posts and give recommendations.
  - Inputs: `likes`, `comments` and `reach` per post. It asks for a clear analysis goal and at least 10 posts.
  - License is **MIT + Commons Clause**, which restricts selling. That matters for a paid client deliverable.
  - [GitHub SKILL.md](https://github.com/borghei/Claude-Skills/blob/main/marketing/social-media-analyzer/SKILL.md)
  - The same repo has a `social-media-manager` skill with a social-audit checklist covering profile, content and engagement. [GitHub](https://github.com/borghei/Claude-Skills/blob/main/marketing/social-media-manager/SKILL.md)
- **Satyam-bloomx/Instagram-audit**
  - FastAPI (Python) backend with an HTML/JS front end. It audits public profiles and competitors.
  - Scoring uses tier baselines (micro ≈3.5%, mid ≈2.0%, macro/mega ≈0.8% engagement) and maps efficiency against the niche peer median. It uses the last 15 posts, with Reels views as a reach proxy.
  - Data comes from Apify actors. LLM use is not documented (an `intelligence.py` file exists).
  - 0 stars and no license stated, so it is useful only as reference logic.
  - [GitHub](https://github.com/Satyam-bloomx/Instagram-audit)
- **oluwadunni1/Instagram**: an LLM pipeline with a single LLM client for structured calls and a regex prefilter that skips the LLM on irrelevant posts. It analyzes vendor posts rather than auditing profiles. [GitHub](https://github.com/oluwadunni1/Instagram), as summarized by the search engine.
- **realjaymes/marketingagentskills**: 32 agent skills, including `icp-persona`, which generates ICP and buyer/user personas for B2B and B2C, plus `customer-segments`. It has no social audit skill. [GitHub](https://github.com/realjaymes/marketingagentskills)
- **irinabuht12-oss/marketing-skills**: 49 free marketing skills, including an "ICP Research Assistant" that builds buyer personas. [GitHub](https://github.com/irinabuht12-oss/marketing-skills)
- **zubair-trabzada/ai-marketing-claude**: 15 Claude Code marketing skills with subagents. `/market audit <url>` is a website audit, not a social one, and it also does content calendars and competitive intelligence. [GitHub](https://github.com/zubair-trabzada/ai-marketing-claude)
- **sergebulaev/instagram-skills** (MIT): captions, carousels, hooks, hashtag strategy and weekly plans. It is content generation, not an audit. [GitHub](https://github.com/sergebulaev/instagram-skills)
- A Medium roundup calls **coreyhaines31/marketingskills** the most-used marketing skill pack, covering CRO, copywriting, SEO, analytics and email. Social audit or ICP coverage is not confirmed. [Medium](https://medium.com/design-bootcamp/10-best-claude-skill-repos-for-marketing-2026-0e308c19514c)
- Reddit-based persona generators are the closest match to "persona from a profile's posts":
  - **Vink0217/reddit-persona-generator** (FastAPI, Gemini, MongoDB): personality traits, motivations, frustrations and emotional scoring. [GitHub](https://github.com/Vink0217/reddit-persona-generator)
  - **shankarsingh077/redditUserPersona** (Python, Llama 3 via Ollama, local): outputs txt and html personas plus a word cloud and sentiment chart. [GitHub](https://github.com/shankarsingh077/redditUserPersona)
  - Topic page with more examples: [persona-generation](https://github.com/topics/persona-generation)
- **microsoft/TinyTroupe**: LLM-powered multi-agent persona simulation "for imagination enhancement and business insights". It could simulate ICP personas reacting to a bio or post. [GitHub](https://github.com/microsoft/TinyTroupe)

### Inferences
- The best reuse path for this client:
  1. Take the prompt structure of ScrapeCreators' `creator-profile-teardown`, `audience-research` and `comment-mining`, and the benchmark math from borghei's analyzer, as **reference designs**.
  2. Reimplement them in the client's own Python and feed them data the client already collects (YouTube Data API v3 and Instagram Business Discovery). This avoids the paid ScrapeCreators dependency and the Commons Clause.
- "Scoring against a goal" is a rubric problem. Define goal → ICP → expected signals (bio promise, proof, CTA, pillars, comment objections), then have the LLM return structured JSON with a score per dimension. No repo found does this out of the box.
- None of these repos mention Portuguese or Brazil. Prompts would need PT-BR localization, and the benchmark tables are generic and global.

### Gaps
- Exact last-commit dates for ScrapeCreators, jev-social and Satyam-bloomx could not be read, because the pages omitted them and the GitHub API was blocked.
- No repo was found that explicitly does "ICP matching of a creator profile". This may exist in closed SaaS only.
- The Hugging Face Spaces search for "Instagram profile audit" was not run, so that coverage is incomplete.

## 2. Which scrapers and collectors are viable and legal-ish in 2026?

### Takeaway
For a weekly GitHub Actions job, **official APIs stay the safest base**: YouTube Data API v3, and Instagram Graph API Business Discovery, which covers only professional accounts. Instaloader (MIT, actively maintained in 2026) is the only acceptable open-source Instagram add-on, used anonymously and slowly. Paid Apify actors are the practical route for TikTok, Instagram and LinkedIn at small scale. Avoid private-API libraries (instagrapi) and LinkedIn scraping: Proxycurl was sued and shut down in 2025.

### Cited Findings
- **Instaloader** (Python, MIT, about 13.1k stars, v4.15.3)
  - Last commit Jul 26, 2026. It is the most maintained open-source Instagram scraper.
  - Login is optional for public data. Ban risk is low when logged out and higher when logged in.
  - [Scrapfly roundup 2026](https://scrapfly.io/blog/posts/best-open-source-instagram-scrapers)
  - Instaloader's troubleshooting docs say:
    - Restarting it often causes 429s.
    - **Cloud, VPN and proxy IPs get much stricter anonymous limits**, which applies to GitHub Actions runners.
    - Logged-in sessions seem less affected.
    - [Instaloader docs mirror](https://git.sudo.is/mirrors/Instaloader/src/branch/master/docs/troubleshooting.rst)
  - A blog estimates the anonymous limit at about 1–2 requests per 30 seconds (401 "please wait"). This is unverified. [apiserpent](https://apiserpent.com/blog/scrape-instagram-for-free)
- **instagrapi** (Python, MIT, about 6.6k stars, last commit Aug 10, 2026)
  - Uses the private mobile API, requires login, and has **high** ban risk. Its maintainers call it "fragile in production".
  - [Scrapfly](https://scrapfly.io/blog/posts/best-open-source-instagram-scrapers)
- **Other Instagram scrapers to avoid or treat as stale**, per [Scrapfly](https://scrapfly.io/blog/posts/best-open-source-instagram-scrapers):
  - drawrowfly instagram-scraper (Node): **stale**, last commit Nov 2022.
  - dilame instagram-private-api (Node): **stale**, last commit Mar 2024.
  - insta-scrape: archived 2021.
  - Osintgram and Toutatis: GPL-3.0, aging (2024–2025).
  - Scrapfly's own instagram-scraper (Python, NPOSL-3.0, last commit Aug 2026) needs a paid Scrapfly key.
- **Instagram Graph API Business Discovery**
  - Returns `followers_count`, `media_count` and `media`, with per-post `like_count`, `comments_count` and `view_count`. `view_count` mixes paid and organic.
  - Requires Facebook Login and an app user with an IG professional account.
  - Age-gated accounts are not returned. Media objects cannot be fetched directly.
  - Only "other Instagram professional accounts" are covered, so personal accounts are not.
  - [Meta docs](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery)
- **TikTok**
  - davidteather/TikTok-Api is an unofficial Python wrapper with about 4.5k stars. That count may be stale, and no 2026 release notes were found. [GitHub sponsors page](https://fr.github.com/sponsors/davidteather); [pyup changelog](https://pyup.io/packages/pypi/tiktokapi/changelog?page=9)
  - TikTok's official developer APIs are free but gated behind an app audit. Tokens expire every 24h. [Blotato](https://www.blotato.com/blog/tiktok-api-pricing); [Zernio](https://zernio.com/blog/tiktok-api) (vendor blogs)
- **Apify actors** (pay-per-event; prices differ by source, so verify on the Store)
  - clockworks TikTok Scraper about $1.70 per 1k results, and TikTok Profile Scraper about $2.50 per 1k.
  - apify/instagram-scraper from about $1.50 per 1k results, and about $2.30 per 1k comments.
  - The hpix community Instagram Scraper lists $10 per 1k profiles.
  - [use-apify best social scrapers](https://use-apify.com/docs/best-apify-actors/best-social-media-scrapers); [use-apify TikTok](https://use-apify.com/docs/best-apify-actors/best-tiktok-scrapers); [Apify hpix pricing](https://apify.com/hpix/instagram-scraper/pricing)
- **yt-dlp** (latest release in results: 2026.07.04, min Python 3.11)
  - YouTube bot checks now often require a JS runtime, PO tokens and/or signed-in cookies.
  - The bgutil PO-token provider itself warns that tokens "no longer bypass the bot check for majority of cases".
  - Sources conflict on whether cookies plus PO token help or hurt.
  - [videohelp version history](https://www.videohelp.com/software/yt-dlp/version-history); [bgutil-ytdlp-pot-provider PyPI](https://pypi.org/project/bgutil-ytdlp-pot-provider); [yt-dlp issue #15793](https://github.com/yt-dlp/yt-dlp/issues/15793)
- **LinkedIn**
  - LinkedIn sued Proxycurl in Jan 2025, alleging hundreds of thousands of fake accounts used to scrape profiles. Proxycurl shut down on **July 4, 2025**, with a settlement or permanent injunction to delete the data.
  - LinkedIn sued ProAPIs in Oct 2025.
  - [Proxycurl founder](https://nubela.co/blog/goodbye-proxycurl/); [Social Media Today](https://www.socialmediatoday.com/news/linkedin-wins-legal-case-data-scrapers-proxycurl/756101/); [linkedapi guide](https://linkedapi.io/guides/proxycurl-alternatives.md)

### Inferences
- Keep the current architecture (YouTube Data API v3 plus IG Business Discovery). It is ToS-compliant and runs on GitHub Actions.
- Add Instaloader only for occasional, anonymous, slow pulls of non-business profiles, and expect blocks from GitHub runner IPs. Never log in with the client's real account.
- Use yt-dlp only for transcripts or subtitles where the API lacks them, and expect CI flakiness. Prefer the official captions endpoint, or a paid transcript API.
- For LinkedIn, do no scraping. Rely on manual export or analysis of the mentor's own profile.

### Gaps
- Whether Business Discovery returns `biography`, `website` and `name` was not confirmed on the fetched page. It is believed yes from memory, but this is unverified.
- Current stars and last commit for TikTok-Api, tomquirk/linkedin-api and joeyism/linkedin_scraper could not be retrieved.
- No source was found on the legal status of the open-source `linkedin-api` package.

## 3. MCP servers and Claude skills or agent plugins for social profile analysis or personas

### Takeaway
There are many MCP servers, but most are thin wrappers over paid data vendors (HasData, InsightSocial, Scavio, Muapi) or over the Instagram Graph API for one's own account. Very few are Python, and none does goal-based auditing. The skill packs listed in section 1 are more useful than the MCP servers as prompt and rubric templates.

### Cited Findings
- **BilalTariq01/instagram-analytics-mcp**: wraps the Instagram Graph API for account insights, media insights and profile info. It needs a business or creator token, so it works for the client's own account only. [GitHub](https://github.com/BilalTariq01/instagram-analytics-mcp)
- **u2n4/video-url-analyzer-mcp**: takes YouTube, TikTok or Instagram video URLs and returns transcripts and AI insights. It uses Gemini. [GitHub](https://github.com/u2n4/video-url-analyzer-mcp)
- **nuelcyoung/tiktok-mcp-server**: read-only, needs no TikTok API keys. It covers search, profiles, videos, comments, creator discovery and transcription. [GitHub](https://github.com/nuelcyoung/tiktok-mcp-server)
- **Vendor-backed MCP servers** (paid, per call):
  - HasData/instagram-mcp: hosted, returns public profile and post-feed JSON. [GitHub](https://github.com/HasData/instagram-mcp)
  - insightsocial/cli: CLI plus MCP, 239 endpoints across IG, TikTok, LinkedIn, YouTube, X and others. [GitHub](https://github.com/insightsocial/cli)
  - scavio-ai/scavio-mcp. [GitHub](https://github.com/scavio-ai/scavio-mcp)
- **socai-io/jev-social** (MIT, 171 stars, 148 commits, date not shown)
  - A "local-first social media research agent" for Instagram, TikTok and LinkedIn. An LLM (OpenRouter, default gpt-4o-mini) picks read-only steps that run in the user's logged-in Chrome, and it produces a source-cited report. Node 22+.
  - It carries account risk because it uses a real logged-in browser.
  - [GitHub](https://github.com/socai-io/jev-social)
- **SamurAIGPT/open-ai-social-agent** (MIT, 1 star): most sub-agents (creator discovery, trend discovery) are still "Blueprint". It depends on the Muapi provider. **Immature.** [GitHub](https://github.com/SamurAIGPT/open-ai-social-agent)
- **`social-media-mcp` GitHub topic** (Oct 2026): mostly publishing and scheduling tools, plus [mysocialio/mysocial-intelligence](https://github.com/topics/social-media-mcp) (reads a creator's post history across platforms) and singaporeandurian/instaseer-mcp (a hosted IG analytics MCP, docs only). All have 0–9 stars. [GitHub topic](https://github.com/topics/social-media-mcp)
- Awesome list section on social-media MCPs: [TensorBlock/awesome-mcp-servers](https://github.com/TensorBlock/awesome-mcp-servers/blob/main/docs/social-media--content-platforms.md)

### Inferences
- The client already has a Python collector. The best fit is to **wrap that collector as a small FastMCP server** (tools: `get_competitor_top_posts`, `get_profile_snapshot`, `run_profile_audit`). Claude or the client's Project OS could then query the same data interactively, with no new vendor dependency.

### Gaps
- Licenses, languages and maintenance dates for most of the MCP repos above were not verified individually.
- No MCP server with PT-BR-specific features was found.

## 4. Open-source psycholinguistic and personality-from-text tools

### Takeaway
**Empath** (Python, 200 categories, r=0.906 correlation with LIWC) is the usable open LIWC alternative, but it is English-only. Hugging Face Big Five models are trained on English essays and explicitly warn against use on short or social text. For PT-BR captions, use **pysentimiento** (sentiment, via BERTabaporu trained on Portuguese tweets) and BERTimbau-based emotion models. Treat any "personality of the audience" output as qualitative LLM interpretation, not as measurement.

### Cited Findings
- **Empath**: an open-source Python library with 200 validated categories. Its categories correlate with LIWC at r=0.906. [arXiv 1602.06979](https://arxiv.org/abs/1602.06979v1); [ecosyste.ms package](https://packages.ecosyste.ms/registries/pypi.org/packages/empath)
- **vladinc/bigfive-regression-model**
  - DistilBERT trained on about 8.7k essays, MIT license, outputs five scores between 0 and 1.
  - The model card warns that generalization to tweets and short texts may be limited, and that it is not for clinical or hiring use.
  - [HF](https://huggingface.co/vladinc/bigfive-regression-model)
- **KevSun/Personality_LM**: Apache-2.0, with a demo Space. Self-reported MSE 0.07 and MAE 0.14. [HF](https://huggingface.co/KevSun/Personality_LM/blob/main/README.md?code=true); [Space](https://www.huggingface.co/spaces/KevSun/Personality_Test/blob/main/app.py)
- **Lily-Trinh/PersonalityTraitsFromText**: TF-IDF plus PyTorch, trained on essays, outputs binary Big Five. [HF](https://huggingface.co/Lily-Trinh/PersonalityTraitsFromText)
- **pysentimiento Portuguese sentiment**: uses BERTabaporu (a RoBERTa model on Portuguese tweets), outputs POS/NEG/NEU, called via `create_analyzer(task="sentiment", lang="pt")`. [HF bertweet-pt-sentiment](https://huggingface.co/ldov/bertweet-pt-sentiment); toolkit paper arXiv 2106.09462.
- **BERTimbau** fine-tuned on a PT translation of GoEmotions for 27-way emotion classification. [STIL/SBC](https://sol.sbc.org.br/index.php/stil/article/view/17784)
- A 2025 benchmark on PT-BR emotion detection compared BERTimbau, Mistral 24B and the EmoAtlas lexicon. BERTimbau had the best average scores, but the authors found "no single top performer". [Ewha Pure](https://pure.ewha.ac.kr/en/publications/benchmarking-psychological-lexicons-and-large-language-models-for/)
- A "liwc-psycholinguistic" agent skill exists on skills.sh (aaddrick/written-voice-replication). It is for voice replication. [skills.sh](https://www.skills.sh/aaddrick/written-voice-replication/liwc-psycholinguistic)

### Inferences
- For a conscious-sales and neuromarketing mentor, the more defensible signals are:
  - emotion and sentiment of **comments** (PT-BR models),
  - recurring objections and desires (LLM extraction, as in `comment-mining`),
  - vocabulary themes (Empath-style categories rebuilt in PT via LLM).
- Big Five scores on bios are not defensible: the models are English, essay-trained and not validated for short text. Present any personality read as a hypothesis, not a diagnosis.

### Gaps
- Empath's maintenance status (it is believed stale for years) and the existence of a Portuguese port were not verified.
- No validated open PT-BR LIWC dictionary was located in this pass. A Brazilian LIWC 2007 PT dictionary is believed to exist, but this is unverified.
- The SEANCE open-source alternative was mentioned only by a secondary source and was not checked.

## 5. Tools that combine profile analysis with trend or algorithm research in one pipeline

### Takeaway
ScrapeCreators' skill pack is the only open, popular project that bundles creator teardown, outliers, comment mining and trend discovery. It depends on a paid API. Other "all-in-one" repos are small or immature. The client's in-house weekly pipeline is already closer to the target than any of them, and the missing pieces are a goal or ICP rubric layer and a comment-mining step.

### Cited Findings
- ScrapeCreators bundles `outlier-post-finder`, `creator-profile-teardown`, `comment-mining`, `trend-discovery` and `competitor-social-research`. [GitHub](https://github.com/ScrapeCreators/social-media-research-skills)
- **kirillsaven/competitors_spy**: a self-hosted Telegram bot with competitor content-trend reports across YouTube, TikTok and Instagram. LLM use is not mentioned. Found via the search summary of the [competitor-analysis topic](https://github.com/topics/competitor-analysis).
- **mdr702/social-dev-agents**: CrewAI plus LangGraph across YouTube, X and Instagram. It is draft-only content creation, not analysis. [GitHub](https://github.com/mdr702/social-dev-agents)
- Other small multi-agent repos:
  - [izoo2003/Social-Media-Agent-With-Engagement-Rival-Analysis-](https://github.com/izoo2003/Social-Media-Agent-With-Engagement-Rival-Analysis-)
  - [Klaudiusz321/social-media-agents](https://github.com/Klaudiusz321/social-media-agents)
- Topic pages for further browsing:
  - [social-media-research](https://github.com/topics/social-media-research)
  - [social-media-analytics](https://github.com/topics/social-media-analytics?o=asc&s=stars)
  - [social-media-analysis](https://github.com/topics/social-media-analysis)
  - [instagram-osint](https://github.com/topics/instagram-osint?o=desc&s=updated)

### Inferences
- Suggested target pipeline for the client:
  1. Weekly collector (existing; YT API v3 plus IG Business Discovery).
  2. Outlier detection against each account's own baseline, following ScrapeCreators' approach.
  3. Comment mining in PT-BR (pysentimiento plus LLM extraction).
  4. Goal/ICP rubric audit of the mentor's own profile (bio, pillars, CTA, proof) against the competitor outliers.
  5. Markdown or JSON report into the Project OS.
  6. Optionally, a FastMCP wrapper for interactive queries.
- All of this is achievable in Python with MIT/Apache dependencies: Instaloader, pysentimiento (check its license), the HF models and FastMCP.

### Gaps
- No combined pipeline with PT-BR or Brazil focus was found.
- Reddit, r/LocalLLaMA and r/SaaS threads were not reviewed in this pass, because the search budget was reached.
- The Hugging Face Spaces survey for "social profile analyzer" was not performed.
