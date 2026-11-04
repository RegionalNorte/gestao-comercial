import {
  ArrowLeftRight,
  Building2,
  Calendar,
  CalendarCheck,
  ClipboardList,
  Home,
  Layers,
  PlusCircle,
  Route,
  Target,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Perfil } from "../../generated/prisma";

export type NavLink = {
  type: "link";
  href: string;
  label: string;
  icon: LucideIcon;
  perfis: Perfil[];
};

// Grupo de módulos de um mesmo serviço comercial (ex.: V&M). O grupo em si não
// tem rota própria — some da tela se nenhum item filho for visível ao perfil.
export type NavGroup = {
  type: "group";
  label: string;
  icon: LucideIcon;
  items: NavLink[];
};

export type NavEntry = NavLink | NavGroup;

const TODOS_PERFIS: Perfil[] = [
  "ADMIN",
  "ANALISTA",
  "GERENTE_REGIONAL",
  "GERENTE_AREA",
  "GERENTE_UNIDADE",
  "GERENTE_COMERCIAL",
];

// Início também recebe o Consultor, que não participa de nenhum outro módulo
// transversal (Unidades/Usuários) nem do V&M.
const TODOS_PERFIS_COM_CONSULTOR: Perfil[] = [...TODOS_PERFIS, "CONSULTOR"];

// Cadastros de base (unidades, fornecedores, usuários) ficam restritos a quem
// mantém a estrutura do sistema; os demais perfis só operam os módulos abaixo.
const MANTEM_CADASTROS: Perfil[] = ["ADMIN", "ANALISTA"];

// Usuários também é visível para Gerente Comercial/Unidade (pares), mas com escopo
// restrito: só conseguem gerenciar Consultores da própria unidade (ver usuarios/page.tsx).
const GERENCIA_USUARIOS: Perfil[] = [...MANTEM_CADASTROS, "GERENTE_COMERCIAL", "GERENTE_UNIDADE"];

// Transferência e verba extra são decisões no nível de área/regional; o
// Gerente de Unidade participa indiretamente (solicita verba, não decide).
const NIVEL_AREA: Perfil[] = ["ADMIN", "ANALISTA", "GERENTE_REGIONAL", "GERENTE_AREA"];

// Reembolso KM: Consultor solicita; Gerente Comercial/Unidade pré-aprova (pares, mesma
// regra de paridade usada no resto do sistema); Gerente Regional aprova; Analista paga.
const REEMBOLSO_KM: Perfil[] = [
  "ADMIN",
  "ANALISTA",
  "GERENTE_REGIONAL",
  "GERENTE_COMERCIAL",
  "GERENTE_UNIDADE",
  "CONSULTOR",
];

// Início, Unidades e Usuários são transversais ao Comercial (servem qualquer
// serviço futuro); os módulos operacionais de V&M ficam agrupados abaixo dele.
export const NAV_ITEMS: NavEntry[] = [
  { type: "link", href: "/", label: "Início", icon: Home, perfis: TODOS_PERFIS_COM_CONSULTOR },
  { type: "link", href: "/unidades", label: "Unidades", icon: Building2, perfis: MANTEM_CADASTROS },
  {
    type: "group",
    label: "V&M",
    icon: Layers,
    items: [
      { type: "link", href: "/fornecedores", label: "Fornecedores", icon: Truck, perfis: MANTEM_CADASTROS },
      { type: "link", href: "/ciclos", label: "Ciclos", icon: Calendar, perfis: MANTEM_CADASTROS },
      { type: "link", href: "/metas-e-valores", label: "Metas e Valores", icon: Target, perfis: TODOS_PERFIS },
      { type: "link", href: "/pedidos", label: "Pedidos", icon: ClipboardList, perfis: TODOS_PERFIS },
      {
        type: "link",
        href: "/transferencias",
        label: "Transferências de Saldo",
        icon: ArrowLeftRight,
        perfis: NIVEL_AREA,
      },
      { type: "link", href: "/verba-extra", label: "Verba Extra", icon: PlusCircle, perfis: NIVEL_AREA },
      { type: "link", href: "/planejamento", label: "Planejamento", icon: CalendarCheck, perfis: TODOS_PERFIS },
    ],
  },
  {
    type: "group",
    label: "Reembolso KM",
    icon: Wallet,
    items: [{ type: "link", href: "/reembolso-km", label: "Pedidos", icon: Route, perfis: REEMBOLSO_KM }],
  },
  { type: "link", href: "/usuarios", label: "Usuários", icon: Users, perfis: GERENCIA_USUARIOS },
];
