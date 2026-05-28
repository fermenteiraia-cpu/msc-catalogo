# Prompt do polish — gpt-image-2 (image-to-image)
#
# Variáveis com `{nome}` são preenchidas pelo arquivo de estilo escolhido em
# docs/render/styles/<estilo>.yaml. A IA recebe ESTE prompt junto com a
# screenshot do HTML do esboço.

Polish this Brazilian retail catalog flyer into a premium 3D rendered version.

ABSOLUTE RULE — TEXT PRESERVATION:
Every piece of text, every product name, every price, every percentage, every date in the source image must remain EXACTLY as shown. Do NOT invent, translate, rephrase, or correct any text. Numbers and prices must be mathematically identical. Capitalization, accents and spelling must match exactly.

LAYOUT PRESERVATION:
Keep the exact composition from the source image. Do not move, add, remove or resize products, headlines, panels, mascot or footer. The mascot stays on the left of the hero, the big headline in the center with the LOJAS MSC logo, the discount panel on the right with bullet terms, the sorteio band below, the product grid filling the lower half, the MSC footer at the bottom.

STYLE DIRECTION for this campaign — "{nome}":
- Mood: {mood}
- Decorative elements to add to the background: {decoracoes}
- Finish to apply to letters and cards: {acabamento}
- Dominant color palette: {cor_dominante}
- Reference style: {referencia}

Final aesthetic target: premium Brazilian retail encarte ("encarte de varejo"), magazine-print quality, ready for offset printing.
