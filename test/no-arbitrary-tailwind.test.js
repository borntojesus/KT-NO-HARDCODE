import rule from "../src/eslint/rules/no-arbitrary-tailwind.js";
import { tsx, err, file } from "./setup.js";

const v = (code) => ({ code, filename: file });
const bad = (code, n = 1, id = "value") => ({ code, filename: file, errors: err(id, n) });

tsx.run("no-arbitrary-tailwind", rule, {
  valid: [
    v(`<div className="p-4 bg-card text-sm rounded-md" />`),
    v(`<div className="data-[state=open]:bg-accent" />`),
    v(`<div className="[&>svg]:size-4 [&_p]:mt-2" />`),
    v(`<div className="group-data-[collapsible=icon]:hidden" />`),
    v(`<div className="aria-[expanded=true]:rotate-180" />`),
    v(`<div className="supports-[backdrop-filter]:bg-background/60" />`),
    v(`<div className="max-[600px]:hidden min-[400px]:flex" />`),
    v(`<div className="bg-(--brand) text-(length:--step-1)" />`),
    v(`<div className="w-[var(--sidebar-width)]" />`),
    v(`<div className="h-[calc(100vh-var(--header))]" />`),
    v(`<div className="h-[calc(100dvh_-_var(--header))]" />`),
    v(`<div className="w-[calc(var(--a)*2)] -mt-[var(--gap)]" />`),
    v(`<div className="max-w-[min(100%,var(--content))]" />`),
    v(`<div className="p-[var(--a,var(--b))]" />`),
    v(`<div className="[--x:var(--y)]" />`),
    v(`<a href="/posts-[id]" />`),
    v(`import Page from "./app-[slug]";`),
    v(`const arr = "a[0] b-[] [x]";`),
    v(`const msg = "Error: value [13px] out of range";`),
  ],
  invalid: [
    bad(`<div className="bg-[#123456]" />`),
    bad(`<div className="p-[13px]" />`),
    bad(`<div className="rounded-[6px]" />`),
    bad(`<div className="text-[14px]" />`),
    bad(`<div className="font-['Inter']" />`),
    bad(`<div className="w-[37rem]" />`),
    bad(`<div className="[mask-type:luminance]" />`, 1, "property"),
    bad(`<div className="[--sidebar:16rem]" />`, 1, "property"),
    bad(`<div className="md:hover:!-mt-[13px]" />`),
    bad(`<div className="-mt-[13px]!" />`),
    bad(`<div className="data-[state=open]:bg-[#fff]" />`),
    bad(`<div className="[&>svg]:size-[18px]" />`),
    bad(`<div className="bg-[#fff]/50" />`),
    bad(`<div className="w-[var(--a,12px)]" />`),
    bad(`<div className="w-[calc(var(--a)+4px)]" />`),
    bad(`<div className="h-[calc(50vh-var(--a))]" />`),
    bad(`<div className="bg-[var(--a)] text-[#fff]" />`),
    bad(`const c = cn("p-4", active && "m-[3px]");`),
    bad(`const c = clsx({ "m-[3px]": active });`),
    bad(`const b = cva("p-[5px]", { variants: { size: { sm: "h-[30px]" } } });`, 2),
    bad(`const t = tv({ slots: { base: "gap-[7px]" } });`),
    bad(`const c = \`p-4 \${x} m-[3px]\`;`),
  ],
});
