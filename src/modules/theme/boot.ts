/** A mesma chave do app: quem escolheu o tema lá e abre o site no mesmo
 * navegador (a Administração, o cadastro) não leva susto. */
export const THEME_KEY = "jayv.theme";

/** Roda no `<head>` antes da primeira pintura, para a página não piscar no
 * claro a cada abertura de quem usa o escuro. */
export const THEME_BOOT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");var d=p==="dark"||((!p||p==="system")&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;if(d)e.classList.add("dark");e.style.colorScheme=d?"dark":"light"}catch(_){}})();`;
