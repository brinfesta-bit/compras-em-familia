// Dados iniciais dos produtos organizados por categoria
export const categorias = [
  {
    id: "hortifrutti",
    nome: "Hortifrúti",
    icone: "🥦",
    cor: "#22c55e",
    itens: [
      "Abacaxi","Abacate","Acerola","Banana","Goiaba","Laranja","Limão",
      "Maçã","Mamão","Manga","Melancia","Melão","Morango","Pera","Uva",
      "Alface","Couve","Repolho","Rúcula","Agrião","Brócolis","Couve-flor",
      "Cenoura","Batata","Batata-doce","Mandioca","Inhame","Tomate","Cebola",
      "Alho","Pimentão","Pepino","Quiabo","Berinjela","Abobrinha","Chuchu"
    ]
  },
  {
    id: "cereais",
    nome: "Cereais e Grãos",
    icone: "🌾",
    cor: "#f59e0b",
    itens: [
      "Arroz branco","Arroz integral","Feijão carioca","Feijão preto","Feijão verde",
      "Lentilha","Grão-de-bico","Ervilha seca","Milho para pipoca","Aveia","Quinoa"
    ]
  },
  {
    id: "massas",
    nome: "Massas",
    icone: "🍝",
    cor: "#f97316",
    itens: [
      "Macarrão espaguete","Macarrão parafuso","Macarrão penne",
      "Lasanha","Massa para pastel","Massa para pizza"
    ]
  },
  {
    id: "padaria",
    nome: "Padaria",
    icone: "🍞",
    cor: "#d97706",
    itens: [
      "Pão francês","Pão de forma","Pão integral","Pão de hambúrguer",
      "Pão de cachorro-quente","Torradas","Bolo","Croissant"
    ]
  },
  {
    id: "carnes",
    nome: "Carnes",
    icone: "🥩",
    cor: "#ef4444",
    itens: [
      "Carne bovina","Carne moída","Picanha","Alcatra","Patinho","Costela bovina",
      "Carne suína","Costela suína","Lombo suíno","Bisteca","Frango inteiro",
      "Peito de frango","Coxa de frango","Sobrecoxa","Asa de frango",
      "Peixe","Tilápia","Sardinha","Atum","Camarão"
    ]
  },
  {
    id: "frios",
    nome: "Frios e Laticínios",
    icone: "🧀",
    cor: "#eab308",
    itens: [
      "Leite integral","Leite desnatado","Leite condensado","Creme de leite",
      "Manteiga","Margarina","Requeijão","Iogurte","Queijo mussarela",
      "Queijo coalho","Queijo parmesão","Presunto","Mortadela","Salame"
    ]
  },
  {
    id: "ovos",
    nome: "Ovos",
    icone: "🥚",
    cor: "#fb923c",
    itens: ["Ovos brancos","Ovos caipiras","Ovos de codorna"]
  },
  {
    id: "enlatados",
    nome: "Enlatados e Conservas",
    icone: "🥫",
    cor: "#64748b",
    itens: [
      "Milho verde","Ervilha","Sardinha em lata","Atum em lata",
      "Palmito","Azeitona","Pepino em conserva"
    ]
  },
  {
    id: "temperos",
    nome: "Temperos e Condimentos",
    icone: "🧂",
    cor: "#8b5cf6",
    itens: [
      "Sal","Açúcar","Açúcar mascavo","Adoçante","Vinagre","Azeite",
      "Óleo de soja","Orégano","Colorau","Cominho","Pimenta-do-reino",
      "Caldo de carne","Caldo de galinha","Ketchup","Mostarda","Maionese"
    ]
  },
  {
    id: "biscoitos",
    nome: "Biscoitos e Snacks",
    icone: "🍪",
    cor: "#a16207",
    itens: [
      "Biscoito cream cracker","Biscoito recheado","Biscoito integral",
      "Salgadinho","Amendoim","Castanha","Pipoca de micro-ondas"
    ]
  },
  {
    id: "doces",
    nome: "Doces",
    icone: "🍫",
    cor: "#ec4899",
    itens: ["Chocolate","Bombom","Goiabada","Doce de leite","Gelatina","Pudim","Sorvete"]
  },
  {
    id: "bebidas",
    nome: "Bebidas",
    icone: "🥤",
    cor: "#06b6d4",
    itens: [
      "Água mineral","Água com gás","Refrigerante","Suco de caixinha",
      "Suco concentrado","Café","Chá","Achocolatado","Energético","Água de coco"
    ]
  },
  {
    id: "congelados",
    nome: "Congelados",
    icone: "🧊",
    cor: "#0ea5e9",
    itens: ["Hambúrguer","Nuggets","Batata frita congelada","Pizza congelada","Lasanha congelada"]
  },
  {
    id: "limpeza",
    nome: "Limpeza",
    icone: "🧹",
    cor: "#14b8a6",
    itens: [
      "Água sanitária","Desinfetante","Detergente","Sabão em pó","Sabão líquido",
      "Amaciante","Esponja","Palha de aço","Limpador multiuso","Álcool","Saco de lixo"
    ]
  },
  {
    id: "higiene",
    nome: "Higiene Pessoal",
    icone: "🪥",
    cor: "#6366f1",
    itens: [
      "Sabonete","Shampoo","Condicionador","Creme dental","Escova de dentes",
      "Fio dental","Desodorante","Papel higiênico","Absorvente","Aparelho de barbear"
    ]
  },
  {
    id: "bebes",
    nome: "Bebês",
    icone: "👶",
    cor: "#f472b6",
    itens: ["Fralda","Lenço umedecido","Pomada para assadura","Talco","Shampoo infantil"]
  },
  {
    id: "pet",
    nome: "Pet Shop",
    icone: "🐾",
    cor: "#84cc16",
    itens: ["Ração para cães","Ração para gatos","Petiscos","Areia para gatos","Shampoo pet"]
  },
  {
    id: "utilidades",
    nome: "Utilidades Domésticas",
    icone: "🏠",
    cor: "#94a3b8",
    itens: [
      "Papel toalha","Guardanapo","Papel alumínio","Filme plástico",
      "Copos descartáveis","Pratos descartáveis","Velas","Fósforos","Pilhas"
    ]
  }
];
