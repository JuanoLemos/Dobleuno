/**
 * Home — portal cream de bienvenida (Ola 10, Día 1).
 *
 * NO usa el AppShell dark. Es una vista editorial con identidad pergamino,
 * inspirada en portal-dobleuno.html. Desde acá el usuario "entra al app"
 * (cruza de cream a dark) yendo a /reglas, /listas, /mesas.
 *
 * El shell dark (TabShell) sigue siendo el contexto de las features;
 * la home es el umbral editorial entre la web pública y el app.
 *
 * Layout mobile-first, responsive a desktop con grid 12-cols.
 */
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, ScrollText, CalendarDays, Sparkles, ArrowRight } from 'lucide-react';

import { Sigil } from '../components/Sigil.js';
import { authClient } from '../lib/auth-client.js';
import { cn } from '../lib/cn.js';
import '../styles/portal.css';

export function Home() {
  const session = authClient.useSession();
  const isLoggedIn = Boolean(session.data?.user);

  return (
    <div className="grain min-h-[100dvh] bg-parchment-50 text-ink antialiased">
      {/* Header — sigil + auth indicator */}
      <header className="border-b border-parchment-200/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <Sigil size="mini" />
            <span className="font-serif text-2xl tracking-tight">
              <FormattedMessage id="app.name" />
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                to="/listas"
                className="cta-primary text-parchment-50 px-4 py-2 rounded-full text-sm font-medium"
              >
                <FormattedMessage id="home.cta.bottom" defaultMessage="Entrar al app" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden text-sm text-ink-soft hover:text-ink sm:inline"
                >
                  <FormattedMessage id="home.cta.signin" defaultMessage="Ingresá" />
                </Link>
                <Link
                  to="/register"
                  className="cta-primary text-parchment-50 px-4 py-2 rounded-full text-sm font-medium"
                >
                  <FormattedMessage id="home.cta.signup" defaultMessage="Crear cuenta" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:px-8 md:pt-24">
        <div className="grid items-end gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="mb-6 text-xs uppercase tracking-[0.2em] text-ink-muted">
              <FormattedMessage id="home.eyebrow" />
            </p>
            <h1 className="font-serif text-5xl leading-[1.02] tracking-tight md:text-7xl">
              <FormattedMessage id="home.headline.l1" defaultMessage="El compañero de" />
              <br />
              <FormattedMessage id="home.headline.l2" defaultMessage="mesa" />{' '}
              <span className="text-blood-500">
                <FormattedMessage
                  id="home.headline.l2.accent"
                  defaultMessage="que cabe"
                />
              </span>
              <br />
              <FormattedMessage id="home.headline.l3" defaultMessage="en tu celu." />
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft">
              <FormattedMessage
                id="home.subheadline"
                defaultMessage="Listas, batallas y reglas de The Old World en la mano. Sin communities, sin leaderboards. Solo vos, tu ejército y un asistente que sabe de qué se trata."
                values={{
                  em: (chunks) => <em className="italic">{chunks}</em>,
                }}
              />
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={isLoggedIn ? '/listas' : '/register'}
                className="cta-primary text-parchment-50 rounded-full px-6 py-3 text-base font-medium"
              >
                <FormattedMessage
                  id="home.cta.primary"
                  defaultMessage="Empezar a armar mi lista"
                />
              </Link>
              <Link
                to="/reglas"
                className="cta-ghost text-ink rounded-full px-6 py-3 text-base"
              >
                <FormattedMessage id="home.cta.secondary" defaultMessage="Ver el reglamento" />
              </Link>
            </div>
            <p className="mt-6 text-xs text-ink-muted">
              v1.2.0 · MVP en construcción. Hecho en la mesa, no en un sprint.
            </p>
          </div>
          <div className="flex justify-center md:col-span-5 md:justify-end">
            <HeroSigil />
          </div>
        </div>
        <div className="scroll-divider mt-20" />
      </section>

      {/* Tres pantallas — features */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <div className="mb-12 grid gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-ink-muted">
              <FormattedMessage id="home.section.features.eyebrow" />
            </p>
            <h2 className="font-serif text-4xl leading-tight md:text-5xl">
              <FormattedMessage id="home.section.features.title" />
              <br />
              <FormattedMessage id="home.section.features.title.l2" />
            </h2>
          </div>
          <div className="md:col-span-5">
            <p className="text-ink-soft">
              <FormattedMessage id="home.section.features.lede" />
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            to="/reglas"
            icon={BookOpen}
            titleId="home.feature.codex.title"
            descId="home.feature.codex.desc"
            ctaId="home.feature.codex.cta"
            iconColor="text-bronze-500"
          />
          <FeatureCard
            to="/listas"
            icon={ScrollText}
            titleId="home.feature.listas.title"
            descId="home.feature.listas.desc"
            ctaId="home.feature.listas.cta"
            iconColor="text-blood-500"
            requiresAuth
            isLoggedIn={isLoggedIn}
          />
          <FeatureCard
            to="/mesas"
            icon={CalendarDays}
            titleId="home.feature.mesas.title"
            descId="home.feature.mesas.desc"
            ctaId="home.feature.mesas.cta"
            iconColor="text-bronze-700"
            requiresAuth
            isLoggedIn={isLoggedIn}
          />
        </div>
        <div className="scroll-divider mt-20" />
      </section>

      {/* El oráculo — preview */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <div className="grid items-start gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-ink-muted">
              <FormattedMessage id="home.section.oracle.eyebrow" />
            </p>
            <h2 className="font-serif text-4xl leading-tight md:text-5xl">
              <FormattedMessage id="home.section.oracle.title" />
              <br />
              <FormattedMessage id="home.section.oracle.title.l2" />
            </h2>
            <p className="mt-4 text-ink-soft">
              <FormattedMessage id="home.section.oracle.lede" />
            </p>
            <div className="mt-6">
              <Link
                to="/reglas"
                className="cta-ghost text-ink inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
              >
                <Sparkles size={14} />
                <FormattedMessage id="home.feature.codex.cta" defaultMessage="Buscar regla" />
              </Link>
            </div>
          </div>
          <div className="md:col-span-7">
            <div className="rounded-3xl border border-parchment-200 bg-parchment-100 p-5 shadow-cream-soft md:p-7">
              <div className="mb-4 flex justify-end">
                <div className="bubble-ask max-w-md rounded-2xl px-4 py-3">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-bronze-700">
                    Vos
                  </p>
                  <p className="text-sm text-ink">
                    <FormattedMessage id="home.oracle.ask" />
                  </p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bubble-answer max-w-md rounded-2xl px-4 py-3">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-blood-500">
                    Dobleuno
                  </p>
                  <p className="text-sm leading-relaxed text-ink">
                    <FormattedMessage id="home.oracle.answer" />
                  </p>
                  <p className="mt-3 text-[10px] italic text-ink-muted">
                    <FormattedMessage id="home.oracle.source" />
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="scroll-divider mt-20" />
      </section>

      {/* Lo que viene — mini roadmap */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <div className="mb-10 grid gap-6 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-ink-muted">
              <FormattedMessage id="home.section.roadmap.eyebrow" />
            </p>
            <h2 className="font-serif text-4xl leading-tight md:text-5xl">
              <FormattedMessage id="home.section.roadmap.title" />
            </h2>
          </div>
          <div className="md:col-span-7">
            <p className="text-ink-soft">
              <FormattedMessage id="home.section.roadmap.lede" />
            </p>
          </div>
        </div>

        <ol className="space-y-4">
          {[
            { wave: 'Ola 0', text: 'Decisiones de stack, alcance, facciones.', done: true },
            { wave: 'Ola 1–5', text: 'Foundation, KB local, list builder, battle tracker, oráculo.', done: true },
            { wave: 'Ola 6–8', text: 'Auth multi-user, server propio, shell con tabs, club.', done: true },
            { wave: 'Ola 9', text: 'Mesas y reservas del club.', done: true },
            { wave: 'Ola 10', text: 'Crónicas: relato de la partida con IA + galería de fotos.', done: true },
            { wave: 'Ola 11', text: 'Codex en React: el reglamento completo, buscable y sin señal.', current: true },
            { wave: 'Ola 12+', text: 'Deploy consolidado, stats, coaching.' },
          ].map((item) => (
            <li
              key={item.wave}
              className={cn(
                'flex items-center justify-between gap-4 rounded-2xl border bg-parchment-50 px-5 py-4 shadow-cream-soft',
                item.current
                  ? 'border-blood-500/40'
                  : 'border-parchment-200',
              )}
            >
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    item.done
                      ? 'bg-bronze-500/15 text-bronze-700'
                      : item.current
                        ? 'bg-blood-500 text-parchment-50'
                        : 'bg-parchment-200 text-ink-soft',
                  )}
                >
                  {item.wave}
                </span>
                <span className="text-sm text-ink">{item.text}</span>
              </div>
              {item.current && (
                <span className="text-xs uppercase tracking-widest text-blood-500">
                  en curso
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* CTA bottom */}
      <section className="border-t border-parchment-200/60 bg-parchment-100/60">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-12 md:px-8">
          <div className="md:col-span-7">
            <h3 className="font-serif text-3xl leading-tight md:text-4xl">
              <FormattedMessage
                id="home.cta.bottom"
                defaultMessage="Entrar al app"
              />
            </h3>
            <p className="mt-3 max-w-xl text-ink-soft">
              <FormattedMessage
                id="home.subheadline"
                defaultMessage="Listas, batallas y reglas de The Old World en la mano."
                values={{
                  em: (chunks) => <em className="italic">{chunks}</em>,
                }}
              />
            </p>
          </div>
          <div className="flex flex-wrap justify-start gap-3 md:col-span-5 md:justify-end">
            {isLoggedIn ? (
              <Link
                to="/listas"
                className="cta-primary text-parchment-50 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium"
              >
                <FormattedMessage id="home.cta.bottom" defaultMessage="Entrar al app" />
                <ArrowRight size={14} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="cta-ghost text-ink rounded-full px-5 py-3 text-sm"
                >
                  <FormattedMessage id="home.cta.signin" defaultMessage="Ingresá" />
                </Link>
                <Link
                  to="/register"
                  className="cta-primary text-parchment-50 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
                >
                  <FormattedMessage id="home.cta.signup" defaultMessage="Crear cuenta" />
                  <ArrowRight size={14} />
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-parchment-200/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-ink-muted md:px-8">
          <p>© 2026 Dobleuno · Hecho en la mesa, no en un sprint.</p>
          <p>
            Fuente de reglas:{' '}
            <a
              className="underline underline-offset-2 hover:text-blood-500"
              href="https://tow.whfb.app"
            >
              tow.whfb.app
            </a>{' '}
            · Reglamento oficial de Games Workshop
          </p>
        </div>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                  */
/* -------------------------------------------------------------------------- */

interface FeatureCardProps {
  to: string;
  icon: LucideIcon;
  titleId: string;
  descId: string;
  ctaId: string;
  iconColor: string;
  requiresAuth?: boolean;
  isLoggedIn?: boolean;
}

function FeatureCard({
  to,
  icon: Icon,
  titleId,
  descId,
  ctaId,
  iconColor,
  requiresAuth,
  isLoggedIn,
}: FeatureCardProps) {
  const locked = requiresAuth && !isLoggedIn;
  const href = locked ? '/login' : to;
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-parchment-200 bg-parchment-50 p-6 shadow-cream-soft transition-all hover:-translate-y-0.5 hover:border-parchment-300 hover:shadow-cream-lifted"
    >
      <div className={cn('mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-parchment-100', iconColor)}>
        <Icon size={20} />
      </div>
      <h3 className="font-serif text-2xl text-ink">
        <FormattedMessage id={titleId} />
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        <FormattedMessage id={descId} />
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blood-500 group-hover:gap-2.5 transition-all">
        <FormattedMessage id={ctaId} />
        <ArrowRight size={14} />
      </div>
    </Link>
  );
}

/**
 * HeroSigil — versión grande del sigil "doble/uno" en heater shield,
 * fiel al portal-dobleuno.html. Se usa solo en la home (no en el app).
 */
function HeroSigil() {
  return (
    <svg
      className="sigil-mark"
      width="240"
      height="288"
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hero-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c41e3a" />
          <stop offset="1" stopColor="#5e0e0e" />
        </linearGradient>
        <linearGradient id="hero-br" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0c283" />
          <stop offset="1" stopColor="#7d5a07" />
        </linearGradient>
      </defs>
      <path
        d="M50 4 L96 4 L96 60 Q96 96 50 116 Q4 96 4 60 L4 4 Z"
        fill="url(#hero-g)"
        stroke="url(#hero-br)"
        strokeWidth="3"
      />
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontFamily="DM Serif Display, serif"
        fontSize="40"
        fill="#f7f5f0"
        fontStyle="italic"
      >
        doble
      </text>
      <text
        x="50"
        y="92"
        textAnchor="middle"
        fontFamily="DM Serif Display, serif"
        fontSize="32"
        fill="#e0c283"
      >
        uno
      </text>
    </svg>
  );
}
