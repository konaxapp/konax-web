"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Home,
  Users,
  CalendarDays,
  Wallet,
  Settings,
  CalendarPlus,
  ChevronRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  LogOut,
} from "lucide-react";

// ============================================================
// KONAX - DASHBOARD SALÓN DE BELLEZA
// Responsive Desktop + Tablet + Mobile
// ============================================================

export default function SalonDashboard() {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // ----------------------------------------------------------
  // DATOS DEL NEGOCIO
  // Luego puedes reemplazar estos valores con datos de Supabase
  // ----------------------------------------------------------

  const negocio = {
    nombre: "SALON DE BELLEZA KATHERINE",
    tipo: "Belleza",
    usuario: "KATHERINE M",
    rol: "Administrador",
    plan: "KONAX Ventas y Gestión",
    estadoPlan: "Activo",
    funciones: 5,
  };

  const menu = [
    {
      nombre: "Inicio",
      href: "/dashboard",
      icono: Home,
    },
    {
      nombre: "Clientes",
      href: "/clientes",
      icono: Users,
    },
    {
      nombre: "Agenda",
      href: "/agenda",
      icono: CalendarDays,
    },
    {
      nombre: "Caja",
      href: "/caja",
      icono: Wallet,
    },
    {
      nombre: "Configuración",
      href: "/configuracion",
      icono: Settings,
    },
  ];

  const estaActivo = (href) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }

    return pathname?.startsWith(href);
  };

  const cerrarMenu = () => {
    setMenuAbierto(false);
  };

  // ----------------------------------------------------------
  // FECHA
  // ----------------------------------------------------------

  const fechaActual = new Intl.DateTimeFormat("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#f5f8f6] text-[#10231a]">
      {/* ======================================================
          HEADER MÓVIL
      ====================================================== */}

      <header className="lg:hidden sticky top-0 z-40 border-b border-[#dbe5df] bg-white/95 backdrop-blur">
        <div className="flex h-[68px] items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#dce5df] bg-white"
            aria-label="Abrir menú"
          >
            <Menu size={23} />
          </button>

          <div className="min-w-0 px-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.20em] text-[#16834f]">
              KONAX
            </p>

            <p className="truncate text-sm font-black uppercase">
              Salón de Belleza
            </p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#123d2d] text-sm font-black text-white">
            K
          </div>
        </div>
      </header>

      {/* ======================================================
          OVERLAY MÓVIL
      ====================================================== */}

      {menuAbierto && (
        <button
          type="button"
          onClick={cerrarMenu}
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          aria-label="Cerrar menú"
        />
      )}

      {/* ======================================================
          DRAWER MÓVIL
      ====================================================== */}

      <aside
        className={`
          fixed left-0 top-0 z-50 h-full w-[82%] max-w-[320px]
          bg-[#0c251b] text-white shadow-2xl transition-transform
          duration-300 lg:hidden
          ${
            menuAbierto
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#43d48d]">
              KONAX
            </p>

            <p className="mt-1 text-lg font-black">
              Salón de Belleza
            </p>
          </div>

          <button
            type="button"
            onClick={cerrarMenu}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"
          >
            <X size={20} />
          </button>
        </div>

        {/* USUARIO */}

        <div className="border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#20a865] font-black">
              K
            </div>

            <div className="min-w-0">
              <p className="truncate font-black">
                {negocio.usuario}
              </p>

              <p className="text-sm text-white/60">
                {negocio.rol}
              </p>
            </div>
          </div>
        </div>

        {/* MENU */}

        <nav className="space-y-2 p-4">
          {menu.map((item) => {
            const Icono = item.icono;
            const activo = estaActivo(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={cerrarMenu}
                className={`
                  flex items-center gap-3 rounded-2xl px-4 py-3.5
                  text-sm font-bold transition
                  ${
                    activo
                      ? "bg-[#20a865] text-white"
                      : "text-white/75 hover:bg-white/10"
                  }
                `}
              >
                <Icono size={20} />

                <span>{item.nombre}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/60">
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ======================================================
          ESTRUCTURA DESKTOP
      ====================================================== */}

      <div className="mx-auto flex min-h-screen max-w-[1700px]">
        {/* ====================================================
            SIDEBAR DESKTOP
        ==================================================== */}

        <aside className="hidden w-[270px] shrink-0 bg-[#0c251b] text-white lg:flex lg:flex-col">
          <div className="border-b border-white/10 px-7 py-7">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#42d58e]">
              KONAX
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Salón
            </h2>

            <p className="mt-1 text-sm text-white/50">
              Gestión del negocio
            </p>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {menu.map((item) => {
              const Icono = item.icono;
              const activo = estaActivo(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 rounded-2xl px-4 py-3.5
                    font-bold transition
                    ${
                      activo
                        ? "bg-[#20a865]"
                        : "text-white/65 hover:bg-white/10"
                    }
                  `}
                >
                  <Icono size={20} />
                  {item.nombre}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#174936] font-black">
                K
              </div>

              <div>
                <p className="text-sm font-bold">
                  {negocio.usuario}
                </p>

                <p className="text-xs text-white/50">
                  {negocio.rol}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ====================================================
            CONTENIDO
        ==================================================== */}

        <main className="min-w-0 flex-1 pb-28 lg:pb-10">
          {/* ==================================================
              HEADER DESKTOP
          ================================================== */}

          <div className="hidden border-b border-[#dce6e0] bg-white px-8 py-5 lg:flex lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.20em] text-[#16834f]">
                KONAX SALÓN DE BELLEZA
              </p>

              <p className="mt-1 text-sm text-[#65736c]">
                {fechaActual}
              </p>
            </div>

            <Link
              href="/agenda?modo=nueva-reserva"
              className="flex items-center gap-2 rounded-xl bg-[#16834f] px-5 py-3 font-bold text-white"
            >
              <CalendarPlus size={19} />

              Nueva reserva
            </Link>
          </div>

          {/* ==================================================
              DASHBOARD
          ================================================== */}

          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            {/* ENCABEZADO */}

            <section>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#16834f]">
                KONAX SALÓN DE BELLEZA
              </p>

              <h1 className="mt-2 max-w-[900px] text-[34px] font-black uppercase leading-[1.03] tracking-tight sm:text-[42px] lg:text-[54px]">
                {negocio.nombre}
              </h1>

              <p className="mt-3 text-sm capitalize text-[#728078] sm:text-base">
                Clientes, Agenda y Caja · {fechaActual}
              </p>
            </section>

            {/* ==================================================
                USUARIO
            ================================================== */}

            <section className="mt-6 rounded-[24px] border border-[#dbe5df] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#123d2d] text-2xl font-black text-white">
                  K
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black">
                    {negocio.usuario}
                  </h2>

                  <p className="mt-1 text-[#78847e]">
                    {negocio.rol}
                  </p>
                </div>
              </div>
            </section>

            {/* ==================================================
                ACCESOS RÁPIDOS
            ================================================== */}

            <section className="mt-6">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.20em] text-[#16834f]">
                Accesos rápidos
              </p>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <AccesoRapido
                  href="/clientes"
                  titulo="Clientes"
                  texto="Gestionar clientes"
                  icono={Users}
                />

                <AccesoRapido
                  href="/agenda"
                  titulo="Agenda"
                  texto="Ver citas"
                  icono={CalendarDays}
                />

                <AccesoRapido
                  href="/agenda?modo=nueva-reserva"
                  titulo="Nueva cita"
                  texto="Crear reserva"
                  icono={CalendarPlus}
                  destacado
                />

                <AccesoRapido
                  href="/caja"
                  titulo="Caja"
                  texto="Registrar cobro"
                  icono={Wallet}
                />
              </div>
            </section>

            {/* ==================================================
                INFORMACIÓN PRINCIPAL
            ================================================== */}

            <section className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
              {/* OPERACIÓN */}

              <article className="relative overflow-hidden rounded-[28px] border border-[#dbe5df] bg-white p-6 shadow-sm sm:p-8">
                <div className="absolute bottom-0 left-0 top-0 w-[8px] bg-gradient-to-b from-[#18b766] to-[#087c74]" />

                <div className="pl-2">
                  <span className="inline-flex rounded-full bg-[#edf8f2] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#16834f]">
                    Operación del salón
                  </span>

                  <h2 className="mt-6 max-w-[650px] text-[39px] font-black leading-[1.04] tracking-tight sm:text-[48px]">
                    Control diario de tu salón
                  </h2>

                  <p className="mt-5 max-w-[690px] text-lg leading-8 text-[#738079]">
                    Gestiona clientes, agenda, caja y configuración de{" "}
                    <strong className="font-bold text-[#32433b]">
                      {negocio.nombre}
                    </strong>{" "}
                    desde un solo lugar.
                  </p>

                  <div className="mt-7 rounded-[22px] border border-[#d7e5de] bg-[#f7fbf9] p-5">
                    <p className="text-xs font-black uppercase tracking-[0.20em] text-[#16834f]">
                      Tipo de negocio
                    </p>

                    <p className="mt-2 text-3xl font-black">
                      {negocio.tipo}
                    </p>
                  </div>
                </div>
              </article>

              {/* PLAN */}

              <article className="rounded-[28px] bg-gradient-to-br from-[#103d2c] to-[#08271c] p-6 text-white shadow-sm sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-black uppercase tracking-[0.20em] text-[#68d99d]">
                    Plan actual
                  </p>

                  <div className="flex items-center gap-2 text-sm font-bold">
                    <span className="h-3 w-3 rounded-full bg-[#4bdc8a]" />

                    {negocio.estadoPlan}
                  </div>
                </div>

                <h2 className="mt-10 text-[38px] font-black leading-tight">
                  {negocio.plan}
                </h2>

                <div className="mt-10 border-t border-white/15 pt-7">
                  <p className="text-sm text-white/60">
                    Funciones disponibles
                  </p>

                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-6xl font-black">
                      {negocio.funciones}
                    </span>

                    <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/15 bg-white/5 text-4xl font-black text-[#66dba0]">
                      K
                    </div>
                  </div>
                </div>
              </article>
            </section>

            {/* ==================================================
                INFORMACIÓN COMPACTA
            ================================================== */}

            <section className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoCard
                icono={ShieldCheck}
                etiqueta="Acceso actual"
                titulo={negocio.rol}
                descripcion="Nivel de acceso asignado a este usuario."
              />

              <InfoCard
                icono={Building2}
                etiqueta="Tipo de negocio"
                titulo={negocio.tipo}
                descripcion="Configuración aplicada a esta empresa."
              />
            </section>

            {/* ==================================================
                MÓDULOS DEL NEGOCIO
            ================================================== */}

            <section className="mt-7">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.20em] text-[#16834f]">
                    Módulos activos
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Gestión del salón
                  </h2>
                </div>

                <CheckCircle2
                  size={25}
                  className="text-[#19a760]"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ModuloCard
                  href="/clientes"
                  titulo="Clientes"
                  descripcion="Información e historial"
                  icono={Users}
                />

                <ModuloCard
                  href="/agenda"
                  titulo="Agenda"
                  descripcion="Citas y servicios"
                  icono={CalendarDays}
                />

                <ModuloCard
                  href="/caja"
                  titulo="Caja"
                  descripcion="Cobros e ingresos"
                  icono={Wallet}
                />

                <ModuloCard
                  href="/configuracion"
                  titulo="Configuración"
                  descripcion="Servicios y personal"
                  icono={Settings}
                />
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ======================================================
          BARRA INFERIOR MÓVIL
      ====================================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#dce5df] bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
        <div className="grid h-[72px] grid-cols-5">
          {menu.map((item) => {
            const Icono = item.icono;
            const activo = estaActivo(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex min-w-0 flex-col items-center justify-center gap-1
                  px-1 text-[10px] font-bold transition
                  ${
                    activo
                      ? "text-[#16834f]"
                      : "text-[#7b8781]"
                  }
                `}
              >
                <div
                  className={`
                    flex h-8 w-10 items-center justify-center rounded-xl
                    ${
                      activo
                        ? "bg-[#e9f7ef]"
                        : ""
                    }
                  `}
                >
                  <Icono size={20} />
                </div>

                <span className="truncate">
                  {item.nombre === "Configuración"
                    ? "Más"
                    : item.nombre}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ============================================================
// COMPONENTE: ACCESO RÁPIDO
// ============================================================

function AccesoRapido({
  href,
  titulo,
  texto,
  icono: Icono,
  destacado = false,
}) {
  return (
    <Link
      href={href}
      className={`
        rounded-[20px] border p-4 transition active:scale-[0.98]
        ${
          destacado
            ? "border-[#16834f] bg-[#16834f] text-white"
            : "border-[#dbe5df] bg-white text-[#10231a]"
        }
      `}
    >
      <Icono
        size={23}
        className={
          destacado
            ? "text-white"
            : "text-[#16834f]"
        }
      />

      <p className="mt-5 font-black">
        {titulo}
      </p>

      <p
        className={`mt-1 text-xs ${
          destacado
            ? "text-white/70"
            : "text-[#7a8780]"
        }`}
      >
        {texto}
      </p>
    </Link>
  );
}

// ============================================================
// COMPONENTE: TARJETA INFORMACIÓN
// ============================================================

function InfoCard({
  icono: Icono,
  etiqueta,
  titulo,
  descripcion,
}) {
  return (
    <article className="rounded-[24px] border border-[#dbe5df] bg-white p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff8f3] text-[#16834f]">
        <Icono size={23} />
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#16834f]">
        {etiqueta}
      </p>

      <h3 className="mt-3 text-2xl font-black">
        {titulo}
      </h3>

      <p className="mt-2 leading-7 text-[#7a8780]">
        {descripcion}
      </p>
    </article>
  );
}

// ============================================================
// COMPONENTE: MÓDULO
// ============================================================

function ModuloCard({
  href,
  titulo,
  descripcion,
  icono: Icono,
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-[22px] border border-[#dbe5df] bg-white p-5 transition hover:border-[#16834f] hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#edf8f2] text-[#16834f]">
        <Icono size={23} />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-black">
          {titulo}
        </h3>

        <p className="mt-1 truncate text-xs text-[#7b8781]">
          {descripcion}
        </p>
      </div>

      <ChevronRight
        size={19}
        className="text-[#9ba49f] transition group-hover:translate-x-1"
      />
    </Link>
  );
}
