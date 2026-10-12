/**
 * Local fake of the GitHub REST endpoints used by issue sync, served with
 * Bun.serve on an ephemeral port. Never touches the network.
 *
 * Supports: issues (create/get/patch/list with since+state+pagination via Link
 * headers), issue comments (create/patch/list with since), labels (list/create),
 * token checking, failure injection, and request recording.
 */

export interface FakeIssue {
  number: number;
  id: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  state_reason: string | null;
  labels: Array<{ name: string; color: string; description: string | null }>;
  assignees: Array<{ login: string }>;
  html_url: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  user: { login: string };
  pull_request?: unknown;
}

export interface FakeComment {
  id: number;
  issue: number;
  body: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  user: { login: string };
}

export interface RecordedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: any;
}

export interface Injection {
  /** Match on method and/or path (string = exact, RegExp = test) */
  method?: string;
  path?: string | RegExp;
  /** Status to answer with (401/403/404/429/500...) */
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
  /** How many matching requests to fail (default 1; Infinity = always) */
  times?: number;
}

export interface FakeGitHubOptions {
  owner?: string;
  repo?: string;
  /** When set, requests with any other bearer token get 401 */
  token?: string;
  /** Text a (misbehaving) host appends to the body of every issue/comment created via POST, e.g. an attribution footer */
  appendOnCreate?: string;
  /** Like appendOnCreate, but also appended to any body set via PATCH (issues and comments) */
  appendOnWrite?: string;
}

export interface FakeGitHub {
  url: string;
  owner: string;
  repo: string;
  requests: RecordedRequest[];
  issues: FakeIssue[];
  comments: FakeComment[];
  labels: Array<{ name: string; color: string; description: string | null }>;
  /** Fail upcoming matching requests */
  inject(i: Injection): void;
  clearInjections(): void;
  /** Seed helpers (do not record requests) */
  seedIssue(p: Partial<FakeIssue> & { title: string }): FakeIssue;
  seedComment(issue: number, body: string, p?: Partial<FakeComment>): FakeComment;
  /** Set the fake clock (ISO string) used for created_at/updated_at; auto-advances 1s per write */
  setClock(iso: string): void;
  /** Change the text appended to every body written via POST/PATCH from now on ("" = behave) */
  setAppendOnWrite(text: string): void;
  count(method: string, pathPattern: RegExp | string): number;
  stop(): void;
}

export function startFakeGitHub(opts: FakeGitHubOptions = {}): FakeGitHub {
  const owner = opts.owner ?? "acme";
  const repo = opts.repo ?? "widgets";
  let clock = Date.parse("2026-01-01T00:00:00Z");
  const tick = () => new Date((clock += 1000)).toISOString();
  let nextIssue = 1;
  let nextComment = 1000;

  const state = {
    issues: [] as FakeIssue[],
    comments: [] as FakeComment[],
    labels: [] as FakeGitHub["labels"],
    requests: [] as RecordedRequest[],
    injections: [] as Array<Injection & { left: number }>,
  };

  const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });

  function paginate<T>(req: URL, items: T[]): Response {
    const perPage = Math.min(100, Math.max(1, Number(req.searchParams.get("per_page") ?? 30)));
    const page = Math.max(1, Number(req.searchParams.get("page") ?? 1));
    const slice = items.slice((page - 1) * perPage, page * perPage);
    const headers: Record<string, string> = {};
    if (page * perPage < items.length) {
      const next = new URL(req.toString());
      next.searchParams.set("page", String(page + 1));
      next.searchParams.set("per_page", String(perPage));
      headers.link = `<${next.toString()}>; rel="next", <${next.toString()}>; rel="last"`;
    }
    return json(slice, 200, headers);
  }

  const resolveLabels = (names?: Array<string | { name: string }>) =>
    (names ?? []).map((n) => {
      const name = typeof n === "string" ? n : n.name;
      return state.labels.find((l) => l.name.toLowerCase() === name.toLowerCase()) ?? { name, color: "ededed", description: null };
    });

  const base = `/repos/${owner}/${repo}`;
  let origin = "";

  function mkIssue(p: Partial<FakeIssue> & { title: string }): FakeIssue {
    const n = nextIssue++;
    const ts = tick();
    return {
      number: n,
      id: 5000 + n,
      body: null,
      state: "open",
      state_reason: null,
      labels: [],
      assignees: [],
      html_url: `https://github.example/${owner}/${repo}/issues/${n}`,
      created_at: ts,
      updated_at: ts,
      closed_at: null,
      user: { login: "fake-user" },
      ...p,
    };
  }

  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;
      let body: any = undefined;
      if (req.method !== "GET" && req.method !== "HEAD") {
        const text = await req.text();
        try {
          body = text ? JSON.parse(text) : undefined;
        } catch {
          body = text;
        }
      }
      const headers: Record<string, string> = {};
      req.headers.forEach((v, k) => (headers[k] = v));
      const query: Record<string, string> = {};
      url.searchParams.forEach((v, k) => (query[k] = v));
      state.requests.push({ method: req.method, path, query, headers, body });

      // Injection
      for (const inj of state.injections) {
        if (inj.left <= 0) continue;
        if (inj.method && inj.method.toUpperCase() !== req.method) continue;
        if (inj.path && !(typeof inj.path === "string" ? inj.path === path : inj.path.test(path))) continue;
        inj.left--;
        return json(inj.body ?? { message: `injected ${inj.status}` }, inj.status, inj.headers);
      }

      if (opts.token && req.headers.get("authorization") !== `Bearer ${opts.token}`) {
        return json({ message: "Bad credentials" }, 401);
      }

      let m: RegExpMatchArray | null;
      const m_ = (re: RegExp) => (m = path.match(re));

      if (path === `${base}/issues` && req.method === "GET") {
        const st = url.searchParams.get("state") ?? "open";
        const since = url.searchParams.get("since");
        const labelFilter = url.searchParams.get("labels")?.split(",").filter(Boolean);
        let list = state.issues.filter((i) => st === "all" || i.state === st);
        if (since) list = list.filter((i) => Date.parse(i.updated_at) >= Date.parse(since));
        if (labelFilter?.length) list = list.filter((i) => labelFilter.every((l) => i.labels.some((x) => x.name === l)));
        list = [...list].sort((a, b) => a.number - b.number);
        return paginate(url, list);
      }
      if (path === `${base}/issues` && req.method === "POST") {
        if (!body?.title) return json({ message: "Validation Failed" }, 422);
        const issue = mkIssue({
          title: body.title,
          body: body.body == null ? (opts.appendOnCreate ?? opts.appendOnWrite ?? null) : body.body + (opts.appendOnCreate ?? opts.appendOnWrite ?? ""),
          labels: resolveLabels(body.labels),
          assignees: (body.assignees ?? []).map((login: string) => ({ login })),
        });
        state.issues.push(issue);
        return json(issue, 201);
      }
      if (m_(new RegExp(`^${base}/issues/(\\d+)$`))) {
        const issue = state.issues.find((i) => i.number === Number(m![1]));
        if (!issue) return json({ message: "Not Found" }, 404);
        if (req.method === "GET") return json(issue);
        if (req.method === "PATCH") {
          if (body.title !== undefined) issue.title = body.title;
          if (body.body !== undefined) issue.body = body.body + (opts.appendOnWrite ?? "");
          if (body.labels !== undefined) issue.labels = resolveLabels(body.labels);
          if (body.assignees !== undefined) issue.assignees = body.assignees.map((login: string) => ({ login }));
          if (body.state !== undefined) {
            issue.state = body.state;
            issue.closed_at = body.state === "closed" ? tick() : null;
            issue.state_reason = body.state_reason ?? (body.state === "closed" ? "completed" : null);
          }
          issue.updated_at = tick();
          return json(issue);
        }
      }
      if (m_(new RegExp(`^${base}/issues/(\\d+)/comments$`))) {
        const num = Number(m![1]);
        if (!state.issues.some((i) => i.number === num)) return json({ message: "Not Found" }, 404);
        if (req.method === "GET") {
          const since = url.searchParams.get("since");
          let list = state.comments.filter((c) => c.issue === num);
          if (since) list = list.filter((c) => Date.parse(c.updated_at) >= Date.parse(since));
          return paginate(url, list.map(({ issue: _i, ...rest }) => rest));
        }
        if (req.method === "POST") {
          if (!body?.body) return json({ message: "Validation Failed" }, 422);
          const ts = tick();
          const id = nextComment++;
          const c: FakeComment = {
            id,
            issue: num,
            body: body.body + (opts.appendOnCreate ?? opts.appendOnWrite ?? ""),
            html_url: `https://github.example/${owner}/${repo}/issues/${num}#issuecomment-${id}`,
            created_at: ts,
            updated_at: ts,
            user: { login: "fake-user" },
          };
          state.comments.push(c);
          const { issue: _i, ...rest } = c;
          return json(rest, 201);
        }
      }
      if (m_(new RegExp(`^${base}/issues/comments/(\\d+)$`)) && req.method === "PATCH") {
        const c = state.comments.find((x) => x.id === Number(m![1]));
        if (!c) return json({ message: "Not Found" }, 404);
        c.body = body.body + (opts.appendOnWrite ?? "");
        c.updated_at = tick();
        const { issue: _i, ...rest } = c;
        return json(rest);
      }
      if (path === `${base}/labels` && req.method === "GET") return paginate(url, state.labels);
      if (path === `${base}/labels` && req.method === "POST") {
        if (state.labels.some((l) => l.name.toLowerCase() === String(body?.name).toLowerCase())) {
          return json({ message: "Validation Failed", errors: [{ code: "already_exists" }] }, 422);
        }
        const l = { name: body.name, color: body.color ?? "ededed", description: body.description ?? null };
        state.labels.push(l);
        return json(l, 201);
      }
      return json({ message: "Not Found" }, 404);
    },
  });
  origin = `http://localhost:${server.port}`;

  return {
    url: origin,
    owner,
    repo,
    requests: state.requests,
    issues: state.issues,
    comments: state.comments,
    labels: state.labels,
    inject(i) {
      state.injections.push({ ...i, left: i.times ?? 1 });
    },
    clearInjections() {
      state.injections.length = 0;
    },
    seedIssue(p) {
      const { labels, ...rest } = p;
      const issue = mkIssue({ ...rest, labels: resolveLabels(labels as any) });
      state.issues.push(issue);
      return issue;
    },
    seedComment(issue, body, p = {}) {
      const ts = tick();
      const id = nextComment++;
      const c: FakeComment = {
        id,
        issue,
        body,
        html_url: `https://github.example/${owner}/${repo}/issues/${issue}#issuecomment-${id}`,
        created_at: ts,
        updated_at: ts,
        user: { login: "fake-user" },
        ...p,
      };
      state.comments.push(c);
      return c;
    },
    setAppendOnWrite(text) {
      opts.appendOnWrite = text;
    },
    setClock(iso) {
      clock = Date.parse(iso);
    },
    count(method, pat) {
      return state.requests.filter(
        (r) => r.method === method.toUpperCase() && (typeof pat === "string" ? r.path === pat : pat.test(r.path)),
      ).length;
    },
    stop() {
      server.stop(true);
    },
  };
}
