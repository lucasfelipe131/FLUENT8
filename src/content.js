const LANGS = {
  en: { name: 'Inglês', flag: '🇺🇸', locale: 'en-US' },
  es: { name: 'Espanhol', flag: '🇪🇸', locale: 'es-ES' },
  fr: { name: 'Francês', flag: '🇫🇷', locale: 'fr-FR' }
};

const SCENARIOS = {
  hotel: {
    icon: '🏨', title: 'Hotel', desc: 'Check-in, quarto e necessidades',
    prompts: {
      en: [
        'Good evening. Welcome to the hotel. Do you have a reservation?',
        'How many nights will you stay with us?',
        'Would you like breakfast included?',
        'What time would you like to check out tomorrow?'
      ],
      es: [
        'Buenas noches. Bienvenido al hotel. ¿Tiene una reserva?',
        '¿Cuántas noches va a quedarse con nosotros?',
        '¿Quiere el desayuno incluido?',
        '¿A qué hora quiere hacer el check-out mañana?'
      ],
      fr: [
        'Bonsoir. Bienvenue à l’hôtel. Vous avez une réservation ?',
        'Vous restez combien de nuits ?',
        'Voulez-vous le petit-déjeuner inclus ?',
        'À quelle heure voulez-vous partir demain ?'
      ]
    }
  },
  restaurant: {
    icon: '🍽️', title: 'Restaurante', desc: 'Pedidos e preferências',
    prompts: {
      en: [
        'Hello. Are you ready to order?',
        'Would you like something to drink?',
        'Do you have any dietary restrictions?',
        'How would you like your steak cooked?'
      ],
      es: [
        'Hola. ¿Está listo para pedir?',
        '¿Quiere algo para beber?',
        '¿Tiene alguna restricción alimentaria?',
        '¿Cómo quiere la carne?'
      ],
      fr: [
        'Bonjour. Vous êtes prêt à commander ?',
        'Vous voulez quelque chose à boire ?',
        'Vous avez des restrictions alimentaires ?',
        'Comment voulez-vous la viande ?'
      ]
    }
  },
  airport: {
    icon: '✈️', title: 'Aeroporto', desc: 'Voos, portões e bagagens',
    prompts: {
      en: [
        'May I see your passport and boarding pass?',
        'Did you pack your bags yourself?',
        'What is the purpose of your trip?',
        'Do you have any items to declare?'
      ],
      es: [
        '¿Puedo ver su pasaporte y su tarjeta de embarque?',
        '¿Empacó usted mismo sus maletas?',
        '¿Cuál es el motivo de su viaje?',
        '¿Tiene algo para declarar?'
      ],
      fr: [
        'Puis-je voir votre passeport et votre carte d’embarquement ?',
        'Avez-vous préparé vos bagages vous-même ?',
        'Quel est le but de votre voyage ?',
        'Vous avez quelque chose à déclarer ?'
      ]
    }
  },
  work: {
    icon: '💼', title: 'Trabalho', desc: 'Reuniões, vendas e apresentações',
    prompts: {
      en: [
        'Could you briefly introduce yourself and your role?',
        'What problem are you trying to solve for the client?',
        'Why is this proposal valuable for them?',
        'How would you answer a price objection?'
      ],
      es: [
        '¿Puede presentarse brevemente y explicar su función?',
        '¿Qué problema intenta resolver para el cliente?',
        '¿Por qué esta propuesta tiene valor para él?',
        '¿Cómo respondería a una objeción de precio?'
      ],
      fr: [
        'Pouvez-vous vous présenter brièvement et expliquer votre rôle ?',
        'Quel problème essayez-vous de résoudre pour le client ?',
        'Pourquoi cette proposition a-t-elle de la valeur pour lui ?',
        'Comment répondriez-vous à une objection sur le prix ?'
      ]
    }
  },
  free: {
    icon: '🗣️', title: 'Conversa livre', desc: 'Fale sobre sua vida e seus objetivos',
    prompts: {
      en: [
        'Tell me a little about your day.',
        'What are you learning right now, and why?',
        'What would make you feel more confident speaking this language?',
        'Tell me about a goal you want to achieve this year.'
      ],
      es: [
        'Cuéntame un poco sobre tu día.',
        '¿Qué estás aprendiendo ahora y por qué?',
        '¿Qué te haría sentir más seguro hablando este idioma?',
        'Cuéntame sobre una meta que quieras alcanzar este año.'
      ],
      fr: [
        'Parlez-moi un peu de votre journée.',
        'Qu’est-ce que vous apprenez en ce moment et pourquoi ?',
        'Qu’est-ce qui vous donnerait plus de confiance pour parler cette langue ?',
        'Parlez-moi d’un objectif que vous voulez atteindre cette année.'
      ]
    }
  }
};

const GOALS = {
  travel: ['✈️', 'Viagem'],
  work: ['💼', 'Trabalho'],
  conversation: ['🗣️', 'Conversação'],
  studies: ['🎓', 'Estudos'],
  relationships: ['❤️', 'Relacionamentos']
};

module.exports={LANGS,SCENARIOS,GOALS};
