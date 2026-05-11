MSC Studio - mini app local
============================

Como usar:
  1. Da duplo-clique em "start.bat"
  2. Aguarde alguns segundos (na primeira vez instala dependencias)
  3. Seu navegador vai abrir automaticamente em http://localhost:8000
     (se nao abrir, copie esse endereco no navegador)

O que faz:
  - Le o catalogo de produtos da API Terasoft
  - Voce escolhe produtos, descontos e marca destaques
  - Gera catalogo PDF + pecas para Instagram, Stories, WhatsApp e TV
  - Salva tudo em ../campanhas/<nome_da_campanha>/

Para parar:
  - Feche a janela preta (CMD) que abriu junto

Requisitos:
  - Python 3.8+ instalado (https://python.org/downloads/)
  - Conexao com internet (para a API Terasoft)
  - Os arquivos mascote_msc.png, logo_msc.png e logo_msc_branco.png
    devem estar na pasta msc_brand (um nivel acima desta pasta)

Estrutura:
  msc_brand/
    mascote_msc.png      <- assets da marca
    logo_msc.png
    logo_msc_branco.png
    app/                 <- ESTA pasta
      start.bat          <- duplo-clique aqui
      main.py            <- servidor FastAPI
      static/index.html  <- frontend
      lib/               <- modulos Python (renderer, etc)
      cache/             <- cache de produtos e fotos
    campanhas/           <- onde sai o resultado
      <slug>/
        catalogo_xxx.pdf
        catalogo_pag1.jpg
        ig/
        story/
        wa/
        tv/

Suporte:
  Se der erro, abra a janela CMD e copie a mensagem de erro.
