"use client";

import { type FormEvent, useCallback, useEffect, useId, useState } from "react";
import styles from "./admin.module.css";

interface AdminPackImage {
  id: string;
  pack_id: string;
  title_pt: string;
  title_en: string;
  image_url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  bytes: number;
  sort_order: number;
  is_published: boolean;
}

interface AdminImagePack {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  cover_url: string;
  audience: "child" | "teen" | "adult" | "all";
  is_free: boolean;
  is_published: boolean;
  sort_order: number;
  total_bytes: number;
  available_from: string | null;
  minimum_app_version: string | null;
  pack_images: AdminPackImage[];
}

interface ApiResult<T = unknown> {
  ok: boolean;
  message?: string;
  packs?: AdminImagePack[];
  pack?: T;
  image?: T;
  token?: string;
}

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
let adminToken = "";

async function api<T = unknown>(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (adminToken) headers.set("Authorization", `Bearer ${adminToken}`);
  const response = await fetch(`${apiBase}${url}`, { ...init, headers });
  const data = (await response.json()) as ApiResult<T>;
  if (!response.ok || !data.ok) throw new Error(data.message ?? "Operação não concluída.");
  return data;
}

export function AdminDashboard() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [packs, setPacks] = useState<AdminImagePack[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const loadPacks = useCallback(async () => {
    const result = await api("/api/admin/packs");
    const next = result.packs ?? [];
    setPacks(next);
    setSelectedId((current) =>
      current && next.some((pack) => pack.id === current) ? current : (next[0]?.id ?? null),
    );
  }, []);

  useEffect(() => {
    const storedToken = window.sessionStorage.getItem("pieceful.admin.session") ?? "";
    if (!storedToken) {
      setChecking(false);
      return;
    }
    adminToken = storedToken;
    setAuthenticated(true);
    void loadPacks()
      .catch(() => {
        adminToken = "";
        window.sessionStorage.removeItem("pieceful.admin.session");
        setAuthenticated(false);
        setMessage("Sua sessão expirou. Entre novamente.");
      })
      .finally(() => setChecking(false));
  }, [loadPacks]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const result = await api("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.get("password") }),
      });
      if (!result.token) throw new Error("A API não retornou uma sessão válida.");
      adminToken = result.token;
      window.sessionStorage.setItem("pieceful.admin.session", result.token);
      setAuthenticated(true);
      await loadPacks();
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Login não concluído.";
      setMessage(nextMessage);
      if (nextMessage.includes("Configure")) setConfigured(false);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    adminToken = "";
    window.sessionStorage.removeItem("pieceful.admin.session");
    setAuthenticated(false);
    setPacks([]);
  }

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operação não concluída.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <AdminLoading />;
  if (!authenticated)
    return <AdminLogin configured={configured} busy={busy} message={message} onSubmit={login} />;

  const selected = packs.find((pack) => pack.id === selectedId) ?? null;
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span>P</span>
          <div>
            <small>CONTENT MANAGEMENT</small>
            <strong>Pieceful Studio</strong>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span>{packs.length} pacotes</span>
          <button type="button" onClick={() => void logout()}>
            Sair
          </button>
        </div>
      </header>
      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>
            <div>
              <small>CATÁLOGO</small>
              <h1>Pacotes</h1>
            </div>
            <button
              type="button"
              title="Atualizar"
              onClick={() => void run(loadPacks, "Catálogo atualizado.")}
            >
              ↻
            </button>
          </div>
          <CreatePackForm disabled={busy} onCreated={() => run(loadPacks, "Pacote criado.")} />
          <div className={styles.packList}>
            {packs.map((pack) => (
              <button
                key={pack.id}
                type="button"
                className={selectedId === pack.id ? styles.packSelected : styles.packItem}
                onClick={() => setSelectedId(pack.id)}
              >
                <span className={styles.packThumb}>
                  {pack.cover_url ? <img src={pack.cover_url} alt="" /> : "✦"}
                </span>
                <span>
                  <strong>{pack.title_pt || pack.slug}</strong>
                  <small>
                    {pack.pack_images.length} imagens · {formatSize(pack.total_bytes)}
                  </small>
                </span>
                <i className={pack.is_published ? styles.live : styles.draft}>
                  {pack.is_published ? "ON" : "OFF"}
                </i>
              </button>
            ))}
            {!packs.length ? (
              <p className={styles.empty}>Crie o primeiro pacote para começar.</p>
            ) : null}
          </div>
        </aside>
        <section className={styles.content}>
          {message ? <div className={styles.notice}>{message}</div> : null}
          {selected ? (
            <PackEditor
              key={selected.id}
              pack={selected}
              disabled={busy}
              onReload={loadPacks}
              run={run}
              onDeleted={() => setSelectedId(null)}
            />
          ) : (
            <div className={styles.welcome}>
              <span>✦</span>
              <h2>Seu catálogo começa aqui</h2>
              <p>
                Crie um pacote e adicione imagens para disponibilizá-lo no aplicativo sem gerar um
                novo build.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function AdminLoading() {
  return (
    <main className={styles.center}>
      <div className={styles.loader} />
      <p>Abrindo Pieceful Studio…</p>
    </main>
  );
}

function AdminLogin({
  configured,
  busy,
  message,
  onSubmit,
}: {
  configured: boolean;
  busy: boolean;
  message: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const passwordId = useId();
  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <div className={styles.loginLogo}>P</div>
        <small>ÁREA RESTRITA</small>
        <h1>Pieceful Studio</h1>
        <p>Gerencie os pacotes e imagens exibidos no aplicativo.</p>
        {!configured ? (
          <div className={styles.error}>
            Configure as variáveis administrativas antes de entrar.
          </div>
        ) : null}
        <form onSubmit={onSubmit}>
          <label htmlFor={passwordId}>Senha administrativa</label>
          <input
            id={passwordId}
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={12}
            required
          />
          <button disabled={busy || !configured} type="submit">
            {busy ? "Entrando…" : "Entrar no Studio"}
          </button>
        </form>
        {message ? <div className={styles.error}>{message}</div> : null}
      </section>
    </main>
  );
}

function CreatePackForm({
  disabled,
  onCreated,
}: {
  disabled: boolean;
  onCreated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await api("/api/admin/packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    formElement.reset();
    setOpen(false);
    await onCreated();
  }
  if (!open)
    return (
      <button className={styles.newPack} type="button" onClick={() => setOpen(true)}>
        ＋ Novo pacote
      </button>
    );
  return (
    <form className={styles.quickForm} onSubmit={(event) => void submit(event)}>
      <input name="title_pt" placeholder="Nome em português" required />
      <input name="title_en" placeholder="Nome em inglês" required />
      <input name="slug" placeholder="slug-do-pacote" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
      <div>
        <button type="button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button disabled={disabled} type="submit">
          Criar
        </button>
      </div>
    </form>
  );
}

function PackEditor({
  pack,
  disabled,
  onReload,
  onDeleted,
  run,
}: {
  pack: AdminImagePack;
  disabled: boolean;
  onReload: () => Promise<void>;
  onDeleted: () => void;
  run: (action: () => Promise<void>, success: string) => Promise<void>;
}) {
  async function savePack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      await api(`/api/admin/packs/${pack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(form),
          sort_order: Number(form.get("sort_order")),
          is_free: form.get("is_free") === "on",
          is_published: form.get("is_published") === "on",
        }),
      });
      await onReload();
    }, "Pacote salvo.");
  }
  async function deletePack() {
    if (!window.confirm(`Excluir “${pack.title_pt}” e todos os registros de imagens?`)) return;
    await run(async () => {
      await api(`/api/admin/packs/${pack.id}`, { method: "DELETE" });
      onDeleted();
      await onReload();
    }, "Pacote excluído.");
  }
  return (
    <div className={styles.editor}>
      <div className={styles.editorHeading}>
        <div>
          <small>EDITANDO PACOTE</small>
          <h2>{pack.title_pt}</h2>
          <p>{pack.slug}</p>
        </div>
        <div className={pack.is_published ? styles.statusLive : styles.statusDraft}>
          {pack.is_published ? "Publicado" : "Rascunho"}
        </div>
      </div>
      <form className={styles.packForm} onSubmit={(event) => void savePack(event)}>
        <div className={styles.formGrid}>
          <Field label="Título em português" name="title_pt" defaultValue={pack.title_pt} />
          <Field label="Título em inglês" name="title_en" defaultValue={pack.title_en} />
          <Field
            label="Slug"
            name="slug"
            defaultValue={pack.slug}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
          <Field
            label="Ordem"
            name="sort_order"
            type="number"
            defaultValue={String(pack.sort_order)}
          />
          <label>
            <span>Público</span>
            <select name="audience" defaultValue={pack.audience}>
              <option value="child">Infantil</option>
              <option value="all">Todas as idades</option>
              <option value="teen">Jovens</option>
              <option value="adult">Adultos</option>
            </select>
          </label>
          <Field
            label="Versão mínima do app"
            name="minimum_app_version"
            defaultValue={pack.minimum_app_version ?? ""}
            pattern="[0-9]+(?:\.[0-9]+){0,2}"
          />
          <Area
            label="Descrição em português"
            name="description_pt"
            defaultValue={pack.description_pt}
          />
          <Area
            label="Descrição em inglês"
            name="description_en"
            defaultValue={pack.description_en}
          />
        </div>
        <div className={styles.options}>
          <label>
            <input name="is_free" type="checkbox" defaultChecked={pack.is_free} /> Gratuito
          </label>
          <label>
            <input name="is_published" type="checkbox" defaultChecked={pack.is_published} />{" "}
            Publicado no app
          </label>
        </div>
        <div className={styles.formActions}>
          <button className={styles.deleteButton} type="button" onClick={() => void deletePack()}>
            Excluir pacote
          </button>
          <button className={styles.saveButton} disabled={disabled} type="submit">
            Salvar alterações
          </button>
        </div>
      </form>
      <div className={styles.imagesHeading}>
        <div>
          <small>CONTEÚDO</small>
          <h2>
            Imagens <span>{pack.pack_images.length}</span>
          </h2>
        </div>
        <span>{formatSize(pack.total_bytes)}</span>
      </div>
      <ImageUpload
        pack={pack}
        disabled={disabled}
        onDone={() => run(onReload, "Imagem adicionada.")}
      />
      <div className={styles.imageGrid}>
        {pack.pack_images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            packId={pack.id}
            coverUrl={pack.cover_url}
            disabled={disabled}
            onDone={onReload}
            run={run}
          />
        ))}
      </div>
    </div>
  );
}

function ImageUpload({
  pack,
  disabled,
  onDone,
}: {
  pack: AdminImagePack;
  disabled: boolean;
  onDone: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  async function select(next: File | null) {
    setFile(next);
    if (!next) return;
    const bitmap = await createImageBitmap(next);
    setDimensions({ width: bitmap.width, height: bitmap.height });
    bitmap.close();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("file", file);
    form.set("width", String(dimensions.width));
    form.set("height", String(dimensions.height));
    form.set("make_cover", String(!pack.cover_url || form.get("make_cover") === "on"));
    form.set("is_published", String(form.get("is_published") === "on"));
    await api(`/api/admin/packs/${pack.id}/images`, { method: "POST", body: form });
    formElement.reset();
    setFile(null);
    await onDone();
  }
  return (
    <form className={styles.upload} onSubmit={(event) => void submit(event)}>
      <label className={styles.drop}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void select(event.target.files?.[0] ?? null)}
          required
        />
        <span>{file ? file.name : "Selecione uma imagem JPG, PNG ou WebP"}</span>
        <small>
          {file
            ? `${dimensions.width} × ${dimensions.height} · ${formatSize(file.size)}`
            : "Até 15 MB"}
        </small>
      </label>
      <div className={styles.uploadFields}>
        <input name="title_pt" placeholder="Título em português" required />
        <input name="title_en" placeholder="Título em inglês" required />
        <input
          name="sort_order"
          type="number"
          defaultValue={pack.pack_images.length * 10}
          aria-label="Ordem"
        />
        <label>
          <input name="is_published" type="checkbox" defaultChecked /> Visível
        </label>
        <label>
          <input name="make_cover" type="checkbox" defaultChecked={!pack.cover_url} /> Usar como
          capa
        </label>
        <button disabled={disabled || !file} type="submit">
          Enviar imagem
        </button>
      </div>
    </form>
  );
}

function ImageCard({
  image,
  packId,
  coverUrl,
  disabled,
  onDone,
  run,
}: {
  image: AdminPackImage;
  packId: string;
  coverUrl: string;
  disabled: boolean;
  onDone: () => Promise<void>;
  run: (action: () => Promise<void>, success: string) => Promise<void>;
}) {
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(async () => {
      await api(`/api/admin/images/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_pt: form.get("title_pt"),
          title_en: form.get("title_en"),
          sort_order: Number(form.get("sort_order")),
          is_published: form.get("is_published") === "on",
        }),
      });
      await onDone();
    }, "Imagem atualizada.");
  }
  async function makeCover() {
    await run(async () => {
      await api(`/api/admin/packs/${packId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_url: image.image_url }),
      });
      await onDone();
    }, "Capa atualizada.");
  }
  async function remove() {
    if (!window.confirm(`Excluir “${image.title_pt}”?`)) return;
    await run(async () => {
      await api(
        `/api/admin/images/${image.id}?packId=${packId}&imageUrl=${encodeURIComponent(image.image_url)}`,
        { method: "DELETE" },
      );
      if (coverUrl === image.image_url)
        await api(`/api/admin/packs/${packId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cover_url: "" }),
        });
      await onDone();
    }, "Imagem excluída.");
  }
  return (
    <article className={styles.imageCard}>
      <div className={styles.imagePreview}>
        <img src={image.thumbnail_url} alt={image.title_pt} />
        {coverUrl === image.image_url ? (
          <span>CAPA</span>
        ) : (
          <button type="button" onClick={() => void makeCover()}>
            Usar como capa
          </button>
        )}
      </div>
      <form onSubmit={(event) => void save(event)}>
        <input name="title_pt" defaultValue={image.title_pt} aria-label="Título em português" />
        <input name="title_en" defaultValue={image.title_en} aria-label="Título em inglês" />
        <div>
          <input
            name="sort_order"
            type="number"
            defaultValue={image.sort_order}
            aria-label="Ordem"
          />
          <label>
            <input name="is_published" type="checkbox" defaultChecked={image.is_published} />{" "}
            Visível
          </label>
        </div>
        <footer>
          <button type="button" onClick={() => void remove()}>
            Excluir
          </button>
          <button disabled={disabled} type="submit">
            Salvar
          </button>
        </footer>
      </form>
    </article>
  );
}

function Field(props: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  pattern?: string;
}) {
  const { label, ...inputProps } = props;
  return (
    <label>
      <span>{label}</span>
      <input {...inputProps} />
    </label>
  );
}
function Area(props: { label: string; name: string; defaultValue: string }) {
  const { label, ...textAreaProps } = props;
  return (
    <label>
      <span>{label}</span>
      <textarea {...textAreaProps} rows={3} />
    </label>
  );
}
function formatSize(bytes: number) {
  if (!bytes) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
