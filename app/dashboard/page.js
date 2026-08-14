"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* ============================================================
   KONAX
   DASHBOARD - SALÓN DE BELLEZA
   NEXT.JS 14
   RESPONSIVE: PC + TABLET + MÓVIL

   IMPORTANTE:
   - NO usa lucide-react
   - NO requiere instalar paquetes
   - Mantiene solo:
     Inicio
     Clientes
     Agenda
     Caja
     Configuración
============================================================ */


/* ============================================================
   ICONOS INTERNOS
   Evitamos dependencias externas
============================================================ */

function Icon({ name, size = 22, className = "" }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
  };

  switch (name) {
    case "menu":
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );

    case "home":
      return (
        <svg {...common}>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v10h14V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4" />
          <path d="M8 3v4" />
          <path d="M3 11h18" />
        </svg>
      );

    case "plusCalendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4" />
          <path d="M8 3v4" />
          <path d="M3 11h18" />
          <path d="M12 14v4" />
          <path d="M10 16h4" />
        </svg>
      );

    case "wallet":
      return (
        <svg {...common}>
          <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6" />
          <path d="M16 13h2" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1V21h-4v-.08A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.2 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4H2v-4h.08A1.7 1.7 0 0 0 4.2 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8.6 4.2a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V2h4v.08A1.7 1.7 0 0 0 15 4.2a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8.6a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1 .4H22v4h-.08a1.7 1.7 0 0 0-1.52 1Z" />
        </svg>
      );

    case "building":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="1" />
          <path d="M8 7h2" />
          <path d="M14 7h2" />
          <path d="M8 11h2" />
          <path d="M14 11h2" />
          <path d="M8 15h2" />
          <path d="M14 15h2" />
          <path d="M10 21v-3h4v3" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      );

    default:
      return null;
  }
}


/* ============================================================
   DASHBOARD
============================================================ */

export default function DashboardSalon() {
  const pathname = usePathname();

  const [menuAbierto, setMenuAbierto] = useState(false);

  /* ==========================================================
     DATOS DEL SALÓN
     Después pueden venir desde Supabase.
  ========================================================== */

  const negocio = {
    nombre: "SALON DE BELLEZA KATHERINE",
    nombreCorto: "SALÓN DE BELLEZA",
    tipo: "Belleza",

    usuario: "KATHERINE M",
    inicial: "K",
    rol: "Administrador",

    plan: "KONAX Ventas y Gestión",
    estadoPlan: "Activo",

    funciones: 5,
  };


  /* ==========================================================
     MENÚ EXCLUSIVO DEL NEGOCIO BELLEZA
  ========================================================== */

  const menu = [
    {
      nombre: "Inicio",
      corto: "Inicio",
      href: "/dashboard",
      icono: "home",
    },

    {
      nombre: "Clientes",
      corto: "Clientes",
      href: "/clientes",
      icono: "users",
    },

    {
      nombre: "Agenda",
      corto: "Agenda",
      href: "/agenda",
      icono: "calendar",
    },

    {
      nombre: "Caja",
      corto: "Caja",
      href: "/caja",
      icono: "wallet",
    },

    {
      nombre: "Configuración",
      corto: "Más",
      href: "/configuracion",
      icono: "settings",
    },
  ];


  /* ==========================================================
     ACTIVE MENU
  ========================================================== */

  function activo(href) {
    if (!pathname) return false;

    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }

    return pathname.startsWith(href);
  }


  /* ==========================================================
     FECHA
  ========================================================== */

  const fecha = new Intl.DateTimeFormat("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());


  return (
    <div className="min-h-screen bg-[#f5f8f6] text-[#12231b]">

      {/* ======================================================
          HEADER MÓVIL
      ====================================================== */}

      <header
        className="
          sticky top-0 z-40
          flex h-[66px]
          items-center justify-between
          border-b border-[#dce6e0]
          bg-white/95
          px-4
          backdrop-blur
          lg:hidden
        "
      >

        <button
          type="button"
          onClick={() => setMenuAbierto(true)}
          className="
            flex h-10 w-10
            items-center justify-center
            rounded-xl
            border border-[#dce6e0]
            bg-white
          "
          aria-label="Abrir menú"
        >
          <Icon name="menu" />
        </button>


        <div className="min-w-0 px-2 text-center">

          <p
            className="
              text-[10px]
              font-black
              uppercase
              tracking-[0.20em]
              text-[#16834f]
            "
          >
            KONAX
          </p>

          <p
            className="
              max-w-[190px]
              truncate
              text-sm
              font-black
              uppercase
            "
          >
            {negocio.nombreCorto}
          </p>

        </div>


        <div
          className="
            flex h-10 w-10
            items-center justify-center
            rounded-xl
            bg-[#103d2c]
            font-black
            text-white
          "
        >
          {negocio.inicial}
        </div>

      </header>


      {/* ======================================================
          OVERLAY MÓVIL
      ====================================================== */}

      {menuAbierto && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuAbierto(false)}
          className="
            fixed inset-0
            z-40
            bg-black/45
            lg:hidden
          "
        />
      )}


      {/* ======================================================
          DRAWER MÓVIL
      ====================================================== */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          h-full
          w-[82%]
          max-w-[320px]
          bg-[#0b291e]
          text-white
          shadow-2xl
          transition-transform
          duration-300
          lg:hidden

          ${
            menuAbierto
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >

        {/* CABECERA DRAWER */}

        <div
          className="
            flex items-center
            justify-between
            border-b border-white/10
            px-5 py-5
          "
        >

          <div>

            <p
              className="
                text-xs
                font-black
                uppercase
                tracking-[0.20em]
                text-[#54d995]
              "
            >
              KONAX
            </p>

            <h2 className="mt-1 text-lg font-black">
              Salón de Belleza
            </h2>

          </div>


          <button
            type="button"
            onClick={() => setMenuAbierto(false)}
            className="
              flex h-10 w-10
              items-center justify-center
              rounded-xl
              bg-white/10
            "
          >
            <Icon name="close" size={21} />
          </button>

        </div>


        {/* USUARIO */}

        <div className="border-b border-white/10 p-5">

          <div className="flex items-center gap-3">

            <div
              className="
                flex h-12 w-12
                items-center justify-center
                rounded-2xl
                bg-[#20a865]
                font-black
              "
            >
              {negocio.inicial}
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


        {/* MENÚ */}

        <nav className="space-y-2 p-4">

          {menu.map((item) => (

            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuAbierto(false)}
              className={`
                flex
                items-center
                gap-3
                rounded-2xl
                px-4
                py-3.5
                text-sm
                font-bold
                transition

                ${
                  activo(item.href)
                    ? "bg-[#20a865] text-white"
                    : "text-white/75 hover:bg-white/10"
                }
              `}
            >

              <Icon
                name={item.icono}
                size={20}
              />

              <span>
                {item.nombre}
              </span>

            </Link>

          ))}

        </nav>


        {/* CERRAR SESIÓN VISUAL */}

        <div
          className="
            absolute
            bottom-0
            left-0
            right-0
            border-t border-white/10
            p-4
          "
        >

          <div
            className="
              flex items-center
              gap-3
              rounded-xl
              px-4 py-3
              text-sm
              text-white/55
            "
          >

            <Icon
              name="logout"
              size={18}
            />

            Cerrar sesión

          </div>

        </div>

      </aside>


      {/* ======================================================
          ESTRUCTURA PRINCIPAL
      ====================================================== */}

      <div
        className="
          mx-auto
          flex
          min-h-screen
          max-w-[1700px]
        "
      >

        {/* ====================================================
            SIDEBAR PC
        ==================================================== */}

        <aside
          className="
            hidden
            w-[270px]
            shrink-0
            flex-col
            bg-[#0b291e]
            text-white
            lg:flex
          "
        >

          <div
            className="
              border-b
              border-white/10
              px-7
              py-7
            "
          >

            <p
              className="
                text-xs
                font-black
                uppercase
                tracking-[0.25em]
                text-[#52d995]
              "
            >
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

            {menu.map((item) => (

              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  px-4
                  py-3.5
                  font-bold
                  transition

                  ${
                    activo(item.href)
                      ? "bg-[#20a865]"
                      : "text-white/65 hover:bg-white/10"
                  }
                `}
              >

                <Icon
                  name={item.icono}
                  size={20}
                />

                {item.nombre}

              </Link>

            ))}

          </nav>


          <div
            className="
              border-t
              border-white/10
              p-5
            "
          >

            <div className="flex items-center gap-3">

              <div
                className="
                  flex h-11 w-11
                  items-center justify-center
                  rounded-xl
                  bg-[#174936]
                  font-black
                "
              >
                {negocio.inicial}
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

        <main
          className="
            min-w-0
            flex-1
            pb-28
            lg:pb-10
          "
        >

          {/* HEADER PC */}

          <div
            className="
              hidden
              items-center
              justify-between
              border-b
              border-[#dce6e0]
              bg-white
              px-8
              py-5
              lg:flex
            "
          >

            <div>

              <p
                className="
                  text-xs
                  font-black
                  uppercase
                  tracking-[0.20em]
                  text-[#16834f]
                "
              >
                KONAX SALÓN DE BELLEZA
              </p>

              <p
                className="
                  mt-1
                  text-sm
                  capitalize
                  text-[#65736c]
                "
              >
                {fecha}
              </p>

            </div>


            <Link
              href="/agenda?modo=nueva-reserva"
              className="
                flex
                items-center
                gap-2
                rounded-xl
                bg-[#16834f]
                px-5
                py-3
                font-bold
                text-white
              "
            >

              <Icon
                name="plusCalendar"
                size={19}
              />

              Nueva reserva

            </Link>

          </div>


          {/* ==================================================
              DASHBOARD
          ================================================== */}

          <div
            className="
              px-4
              py-5
              sm:px-6
              lg:px-8
              lg:py-8
            "
          >

            {/* TITULO */}

            <section>

              <p
                className="
                  text-xs
                  font-black
                  uppercase
                  tracking-[0.22em]
                  text-[#16834f]
                "
              >
                KONAX SALÓN DE BELLEZA
              </p>


              <h1
                className="
                  mt-2
                  max-w-[900px]
                  text-[34px]
                  font-black
                  uppercase
                  leading-[1.03]
                  tracking-tight
                  sm:text-[42px]
                  lg:text-[54px]
                "
              >
                {negocio.nombre}
              </h1>


              <p
                className="
                  mt-3
                  text-sm
                  capitalize
                  text-[#728078]
                  sm:text-base
                "
              >
                Clientes, Agenda y Caja · {fecha}
              </p>

            </section>


            {/* USUARIO */}

            <section
              className="
                mt-6
                rounded-[24px]
                border
                border-[#dbe5df]
                bg-white
                p-4
                shadow-sm
                sm:p-5
              "
            >

              <div className="flex items-center gap-4">

                <div
                  className="
                    flex h-16 w-16
                    shrink-0
                    items-center justify-center
                    rounded-[20px]
                    bg-[#123d2d]
                    text-2xl
                    font-black
                    text-white
                  "
                >
                  {negocio.inicial}
                </div>


                <div className="min-w-0">

                  <h2
                    className="
                      truncate
                      text-xl
                      font-black
                    "
                  >
                    {negocio.usuario}
                  </h2>

                  <p
                    className="
                      mt-1
                      text-[#78847e]
                    "
                  >
                    {negocio.rol}
                  </p>

                </div>

              </div>

            </section>


            {/* =================================================
                ACCESOS RÁPIDOS
            ================================================= */}

            <section className="mt-6">

              <p
                className="
                  mb-3
                  text-xs
                  font-black
                  uppercase
                  tracking-[0.20em]
                  text-[#16834f]
                "
              >
                Accesos rápidos
              </p>


              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                  lg:grid-cols-4
                "
              >

                <AccesoRapido
                  href="/clientes"
                  titulo="Clientes"
                  texto="Gestionar clientes"
                  icono="users"
                />


                <AccesoRapido
                  href="/agenda"
                  titulo="Agenda"
                  texto="Ver citas"
                  icono="calendar"
                />


                <AccesoRapido
                  href="/agenda?modo=nueva-reserva"
                  titulo="Nueva cita"
                  texto="Crear reserva"
                  icono="plusCalendar"
                  destacado
                />


                <AccesoRapido
                  href="/caja"
                  titulo="Caja"
                  texto="Registrar cobro"
                  icono="wallet"
                />

              </div>

            </section>


            {/* =================================================
                OPERACIÓN + PLAN
            ================================================= */}

            <section
              className="
                mt-6
                grid
                gap-5
                xl:grid-cols-[1.35fr_0.9fr]
              "
            >

              {/* CONTROL DIARIO */}

              <article
                className="
                  relative
                  overflow-hidden
                  rounded-[28px]
                  border
                  border-[#dbe5df]
                  bg-white
                  p-6
                  shadow-sm
                  sm:p-8
                "
              >

                <div
                  className="
                    absolute
                    bottom-0
                    left-0
                    top-0
                    w-[8px]
                    bg-gradient-to-b
                    from-[#18b766]
                    to-[#087c74]
                  "
                />


                <div className="pl-2">

                  <span
                    className="
                      inline-flex
                      rounded-full
                      bg-[#edf8f2]
                      px-4
                      py-2
                      text-xs
                      font-black
                      uppercase
                      tracking-[0.18em]
                      text-[#16834f]
                    "
                  >
                    Operación del salón
                  </span>


                  <h2
                    className="
                      mt-6
                      max-w-[650px]
                      text-[37px]
                      font-black
                      leading-[1.04]
                      tracking-tight
                      sm:text-[48px]
                    "
                  >
                    Control diario de tu salón
                  </h2>


                  <p
                    className="
                      mt-5
                      max-w-[690px]
                      text-lg
                      leading-8
                      text-[#738079]
                    "
                  >
                    Gestiona clientes, agenda, caja y
                    configuración de{" "}

                    <strong
                      className="
                        font-bold
                        text-[#32433b]
                      "
                    >
                      {negocio.nombre}
                    </strong>

                    {" "}desde un solo lugar.
                  </p>


                  <div
                    className="
                      mt-7
                      rounded-[22px]
                      border
                      border-[#d7e5de]
                      bg-[#f7fbf9]
                      p-5
                    "
                  >

                    <p
                      className="
                        text-xs
                        font-black
                        uppercase
                        tracking-[0.20em]
                        text-[#16834f]
                      "
                    >
                      Tipo de negocio
                    </p>

                    <p
                      className="
                        mt-2
                        text-3xl
                        font-black
                      "
                    >
                      {negocio.tipo}
                    </p>

                  </div>

                </div>

              </article>


              {/* PLAN */}

              <article
                className="
                  rounded-[28px]
                  bg-gradient-to-br
                  from-[#103d2c]
                  to-[#08271c]
                  p-6
                  text-white
                  shadow-sm
                  sm:p-8
                "
              >

                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                  "
                >

                  <p
                    className="
                      text-xs
                      font-black
                      uppercase
                      tracking-[0.20em]
                      text-[#68d99d]
                    "
                  >
                    Plan actual
                  </p>


                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      text-sm
                      font-bold
                    "
                  >

                    <span
                      className="
                        h-3
                        w-3
                        rounded-full
                        bg-[#4bdc8a]
                      "
                    />

                    {negocio.estadoPlan}

                  </div>

                </div>


                <h2
                  className="
                    mt-10
                    text-[38px]
                    font-black
                    leading-tight
                  "
                >
                  {negocio.plan}
                </h2>


                <div
                  className="
                    mt-10
                    border-t
                    border-white/15
                    pt-7
                  "
                >

                  <p className="text-sm text-white/60">
                    Funciones disponibles
                  </p>


                  <div
                    className="
                      mt-2
                      flex
                      items-end
                      justify-between
                    "
                  >

                    <span className="text-6xl font-black">
                      {negocio.funciones}
                    </span>


                    <div
                      className="
                        flex h-20 w-20
                        items-center
                        justify-center
                        rounded-[24px]
                        border
                        border-white/15
                        bg-white/5
                        text-4xl
                        font-black
                        text-[#66dba0]
                      "
                    >
                      K
                    </div>

                  </div>

                </div>

              </article>

            </section>


            {/* =================================================
                ACCESO + NEGOCIO
            ================================================= */}

            <section
              className="
                mt-5
                grid
                gap-4
                md:grid-cols-2
              "
            >

              <InfoCard
                icono="shield"
                etiqueta="Acceso actual"
                titulo={negocio.rol}
                descripcion="Nivel de acceso asignado a este usuario."
              />


              <InfoCard
                icono="building"
                etiqueta="Tipo de negocio"
                titulo={negocio.tipo}
                descripcion="Configuración aplicada a esta empresa."
              />

            </section>


            {/* =================================================
                MÓDULOS ACTIVOS
            ================================================= */}

            <section className="mt-7">

              <div
                className="
                  mb-4
                  flex
                  items-center
                  justify-between
                "
              >

                <div>

                  <p
                    className="
                      text-xs
                      font-black
                      uppercase
                      tracking-[0.20em]
                      text-[#16834f]
                    "
                  >
                    Módulos activos
                  </p>

                  <h2
                    className="
                      mt-1
                      text-2xl
                      font-black
                    "
                  >
                    Gestión del salón
                  </h2>

                </div>


                <Icon
                  name="check"
                  size={25}
                  className="text-[#19a760]"
                />

              </div>


              <div
                className="
                  grid
                  gap-3
                  sm:grid-cols-2
                  xl:grid-cols-4
                "
              >

                <ModuloCard
                  href="/clientes"
                  titulo="Clientes"
                  descripcion="Información e historial"
                  icono="users"
                />


                <ModuloCard
                  href="/agenda"
                  titulo="Agenda"
                  descripcion="Citas y servicios"
                  icono="calendar"
                />


                <ModuloCard
                  href="/caja"
                  titulo="Caja"
                  descripcion="Cobros e ingresos"
                  icono="wallet"
                />


                <ModuloCard
                  href="/configuracion"
                  titulo="Configuración"
                  descripcion="Servicios y personal"
                  icono="settings"
                />

              </div>

            </section>

          </div>

        </main>

      </div>


      {/* ======================================================
          BARRA INFERIOR MÓVIL
      ====================================================== */}

      <nav
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-30
          border-t
          border-[#dce5df]
          bg-white/95
          px-1
          pb-[env(safe-area-inset-bottom)]
          shadow-[0_-4px_20px_rgba(0,0,0,0.06)]
          backdrop-blur
          lg:hidden
        "
      >

        <div
          className="
            grid
            h-[72px]
            grid-cols-5
          "
        >

          {menu.map((item) => (

            <Link
              key={item.href}
              href={item.href}
              className={`
                flex
                min-w-0
                flex-col
                items-center
                justify-center
                gap-1
                px-1
                text-[10px]
                font-bold
                transition

                ${
                  activo(item.href)
                    ? "text-[#16834f]"
                    : "text-[#7b8781]"
                }
              `}
            >

              <div
                className={`
                  flex
                  h-8
                  w-10
                  items-center
                  justify-center
                  rounded-xl

                  ${
                    activo(item.href)
                      ? "bg-[#e9f7ef]"
                      : ""
                  }
                `}
              >

                <Icon
                  name={item.icono}
                  size={20}
                />

              </div>


              <span className="truncate">
                {item.corto}
              </span>

            </Link>

          ))}

        </div>

      </nav>

    </div>
  );
}


/* ============================================================
   ACCESO RÁPIDO
============================================================ */

function AccesoRapido({
  href,
  titulo,
  texto,
  icono,
  destacado = false,
}) {

  return (

    <Link
      href={href}
      className={`
        rounded-[20px]
        border
        p-4
        transition
        active:scale-[0.98]

        ${
          destacado
            ? "border-[#16834f] bg-[#16834f] text-white"
            : "border-[#dbe5df] bg-white text-[#10231a]"
        }
      `}
    >

      <Icon
        name={icono}
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
        className={`
          mt-1
          text-xs

          ${
            destacado
              ? "text-white/70"
              : "text-[#7a8780]"
          }
        `}
      >
        {texto}
      </p>

    </Link>

  );
}


/* ============================================================
   INFO CARD
============================================================ */

function InfoCard({
  icono,
  etiqueta,
  titulo,
  descripcion,
}) {

  return (

    <article
      className="
        rounded-[24px]
        border
        border-[#dbe5df]
        bg-white
        p-6
        shadow-sm
      "
    >

      <div
        className="
          flex h-12 w-12
          items-center justify-center
          rounded-2xl
          bg-[#eff8f3]
          text-[#16834f]
        "
      >

        <Icon
          name={icono}
          size={23}
        />

      </div>


      <p
        className="
          mt-5
          text-xs
          font-black
          uppercase
          tracking-[0.18em]
          text-[#16834f]
        "
      >
        {etiqueta}
      </p>


      <h3
        className="
          mt-3
          text-2xl
          font-black
        "
      >
        {titulo}
      </h3>


      <p
        className="
          mt-2
          leading-7
          text-[#7a8780]
        "
      >
        {descripcion}
      </p>

    </article>

  );
}


/* ============================================================
   MÓDULO
============================================================ */

function ModuloCard({
  href,
  titulo,
  descripcion,
  icono,
}) {

  return (

    <Link
      href={href}
      className="
        group
        flex
        items-center
        gap-4
        rounded-[22px]
        border
        border-[#dbe5df]
        bg-white
        p-5
        transition
        hover:border-[#16834f]
        hover:shadow-md
        active:scale-[0.99]
      "
    >

      <div
        className="
          flex h-12 w-12
          shrink-0
          items-center
          justify-center
          rounded-2xl
          bg-[#edf8f2]
          text-[#16834f]
        "
      >

        <Icon
          name={icono}
          size={23}
        />

      </div>


      <div className="min-w-0 flex-1">

        <h3 className="font-black">
          {titulo}
        </h3>

        <p
          className="
            mt-1
            truncate
            text-xs
            text-[#7b8781]
          "
        >
          {descripcion}
        </p>

      </div>


      <Icon
        name="arrow"
        size={19}
        className="
          text-[#9ba49f]
          transition
          group-hover:translate-x-1
        "
      />

    </Link>

  );
}
