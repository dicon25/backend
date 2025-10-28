import { PrismaClient } from '../client';

const prisma = new PrismaClient;

async function main() {
  console.log('🌱 Start seeding...');

  // Test users
  console.log('👤 Creating users...');

  const testUsers = [
    {
      email:      'admin@example.com',
      providerId: 'google_admin_123',
      provider:   'GOOGLE' as const,
      name:       'Admin User',
      bio:        'Platform administrator',
      status:     'ACTIVE' as const,
    },
    {
      email:      'user@example.com',
      providerId: 'google_user_456',
      provider:   'GOOGLE' as const,
      name:       'Test User',
      bio:        'AI and Machine Learning enthusiast',
      status:     'ACTIVE' as const,
    },
    {
      email:      'researcher@example.com',
      providerId: 'google_researcher_789',
      provider:   'GOOGLE' as const,
      name:       'Dr. Jane Smith',
      bio:        'Computer Science researcher focusing on NLP',
      status:     'ACTIVE' as const,
    },
  ];

  const createdUsers: any[] = [];

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where:  { email: userData.email },
      update: {},
      create: userData,
    });

    createdUsers.push(user);

    console.log(`✅ Created user: ${user.email} (${user.name})`);
  }

  // Sample papers
  console.log('📄 Creating papers...');

  const samplePapers = [
    {
      title: 'Attention Is All You Need',
      abstract:
        'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...',
      introduction:
        'Revolutionary paper introducing the Transformer architecture that changed the landscape of NLP.',
      categories: ['Artificial Intelligence', 'Natural Language Processing'],
      tags:       [
        'transformer', 'attention', 'deep-learning', 'nlp',
      ],
      authors: [
        'Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar',
      ],
      year:    2017,
      journal: 'NeurIPS',
      volume:  30,
      pages:   '5998-6008',
      doi:     '10.48550/arXiv.1706.03762',
      url:     'https://arxiv.org/abs/1706.03762',
      aiSummary:
        'This groundbreaking paper introduces the Transformer model, which relies entirely on attention mechanisms and eliminates recurrence. It achieved state-of-the-art results in machine translation tasks.',
    },
    {
      title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
      abstract:
        'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers...',
      introduction:
        'BERT revolutionized NLP by introducing bidirectional pre-training for language understanding tasks.',
      categories: ['Artificial Intelligence', 'Natural Language Processing'],
      tags:       [
        'bert', 'transformer', 'pre-training', 'nlp',
      ],
      authors: [
        'Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova',
      ],
      year:    2019,
      journal: 'NAACL',
      pages:   '4171-4186',
      doi:     '10.18653/v1/N19-1423',
      url:     'https://arxiv.org/abs/1810.04805',
      aiSummary:
        'BERT introduces a bidirectional pre-training approach for transformers, achieving state-of-the-art results across 11 NLP tasks.',
    },
    {
      title: 'GPT-3: Language Models are Few-Shot Learners',
      abstract:
        'Recent work has demonstrated substantial gains on many NLP tasks and benchmarks by pre-training on a large corpus of text...',
      introduction:
        'GPT-3 demonstrates that scaling up language models leads to impressive few-shot learning capabilities.',
      categories: ['Artificial Intelligence', 'Natural Language Processing'],
      tags:       [
        'gpt', 'language-model', 'few-shot', 'scaling',
      ],
      authors: [
        'Tom B. Brown', 'Benjamin Mann', 'Nick Ryder',
      ],
      year:    2020,
      journal: 'NeurIPS',
      volume:  33,
      pages:   '1877-1901',
      doi:     '10.48550/arXiv.2005.14165',
      url:     'https://arxiv.org/abs/2005.14165',
      aiSummary:
        'GPT-3, with 175 billion parameters, shows that large language models can perform various tasks with minimal examples.',
    },
    {
      title: 'Deep Residual Learning for Image Recognition',
      abstract:
        'Deeper neural networks are more difficult to train. We present a residual learning framework...',
      introduction:
        'ResNet introduced skip connections that enabled training of very deep neural networks.',
      categories: ['Artificial Intelligence', 'Computer Vision'],
      tags:       [
        'resnet', 'deep-learning', 'computer-vision', 'cnn',
      ],
      authors: [
        'Kaiming He', 'Xiangyu Zhang', 'Shaoqing Ren', 'Jian Sun',
      ],
      year:    2016,
      journal: 'CVPR',
      pages:   '770-778',
      doi:     '10.1109/CVPR.2016.90',
      url:     'https://arxiv.org/abs/1512.03385',
      aiSummary:
        'ResNet introduced residual connections that solve the degradation problem in deep neural networks, winning ImageNet 2015.',
    },
    {
      title: 'Generative Adversarial Networks',
      abstract:
        'We propose a new framework for estimating generative models via an adversarial process...',
      introduction: 'GANs introduced a revolutionary approach to generative modeling using adversarial training.',
      categories:   ['Artificial Intelligence', 'Machine Learning'],
      tags:         [
        'gan', 'generative-model', 'deep-learning',
      ],
      authors: [
        'Ian J. Goodfellow', 'Jean Pouget-Abadie', 'Mehdi Mirza',
      ],
      year:    2014,
      journal: 'NeurIPS',
      volume:  27,
      doi:     '10.48550/arXiv.1406.2661',
      url:     'https://arxiv.org/abs/1406.2661',
      aiSummary:
        'GANs pit two neural networks against each other to generate realistic synthetic data, revolutionizing generative AI.',
    },
  ];

  const createdPapers: any[] = [];

  for (const paperData of samplePapers) {
    const paper = await prisma.paper.upsert({
      where:  { doi: paperData.doi },
      update: {},
      create: paperData,
    });

    createdPapers.push(paper);

    console.log(`✅ Created paper: ${paper.title}`);
  }

  // User preferences
  console.log('⚙️ Creating user preferences...');

  for (const user of createdUsers) {
    await prisma.userPreference.upsert({
      where:  { userId: user.id },
      update: {},
      create: {
        userId:               user.id,
        interestedCategories: ['Artificial Intelligence', 'Machine Learning'],
        interestedTags:       [
          'deep-learning', 'nlp', 'transformer',
        ],
        enableNotifications:       true,
        enableRecommendations:     true,
        enableSimilarPaperAlerts:  true,
        enableOpposingPaperAlerts: true,
      },
    });

    console.log(`✅ Created preference for: ${user.email}`);
  }

  // Bookmarks
  console.log('🔖 Creating bookmarks...');

  if (createdUsers.length > 0 && createdPapers.length > 0) {
    await prisma.bookmark.create({ data: {
      userId:  createdUsers[1].id,
      paperId: createdPapers[0].id,
      note:    'Must read - foundational paper',
      folder:  'Transformers',
    } });

    await prisma.bookmark.create({ data: {
      userId:  createdUsers[1].id,
      paperId: createdPapers[1].id,
      note:    'Important for my research',
      folder:  'Transformers',
    } });

    console.log('✅ Created bookmarks');
  }

  // Comments
  console.log('💬 Creating comments...');

  if (createdUsers.length > 0 && createdPapers.length > 0) {
    const comment1 = await prisma.comment.create({ data: {
      userId:  createdUsers[1].id,
      paperId: createdPapers[0].id,
      content: 'This paper completely changed how we approach sequence modeling!',
    } });

    await prisma.comment.create({ data: {
      userId:   createdUsers[2].id,
      paperId:  createdPapers[0].id,
      content:  'Agreed! The attention mechanism is so elegant.',
      parentId: comment1.id,
    } });

    console.log('✅ Created comments');
  }

  // Reactions
  console.log('👍 Creating reactions...');

  if (createdUsers.length > 0 && createdPapers.length > 0) {
    await prisma.reaction.createMany({
      data: [
        {
          userId: createdUsers[1].id, paperId: createdPapers[0].id, type: 'LIKE',
        },
        {
          userId: createdUsers[2].id, paperId: createdPapers[0].id, type: 'LIKE',
        },
        {
          userId: createdUsers[1].id, paperId: createdPapers[1].id, type: 'LIKE',
        },
      ],
      skipDuplicates: true,
    });

    console.log('✅ Created reactions');
  }

  // Paper relations
  console.log('🔗 Creating paper relations...');

  if (createdPapers.length >= 3) {
    await prisma.paperRelation.createMany({
      data: [
        {
          sourcePaperId:   createdPapers[0].id,
          relatedPaperId:  createdPapers[1].id,
          type:            'SIMILAR',
          similarityScore: 0.85,
          description:     'Both papers use transformer architecture',
        },
        {
          sourcePaperId:   createdPapers[1].id,
          relatedPaperId:  createdPapers[2].id,
          type:            'EXTENSION',
          similarityScore: 0.75,
          description:     'GPT-3 extends the pre-training approach of BERT',
        },
      ],
      skipDuplicates: true,
    });

    console.log('✅ Created paper relations');
  }

  // Subscriptions
  console.log('📬 Creating subscriptions...');

  if (createdUsers.length > 0) {
    await prisma.subscription.createMany({
      data: [
        {
          userId: createdUsers[1].id,
          type:   'CATEGORY',
          target: 'Artificial Intelligence',
        },
        {
          userId: createdUsers[1].id,
          type:   'TAG',
          target: 'transformer',
        },
      ],
      skipDuplicates: true,
    });

    console.log('✅ Created subscriptions');
  }

  // Update paper statistics
  console.log('📊 Updating paper statistics...');

  for (const paper of createdPapers) {
    const likeCount = await prisma.reaction.count({ where: {
      paperId: paper.id, type: 'LIKE',
    } });

    const commentCount = await prisma.comment.count({ where: { paperId: paper.id } });

    await prisma.paper.update({
      where: { id: paper.id },
      data:  {
        likeCount,
        commentCount,
        totalViewCount: Math.floor(Math.random() * 1000) + 100,
      },
    });
  }

  console.log('✅ Updated statistics');

  console.log('🌱 Seeding finished successfully!');

  console.log(`
📊 Summary:
  - Users: ${createdUsers.length}
  - Papers: ${createdPapers.length}
  - Bookmarks: 2
  - Comments: 2
  - Reactions: 3
  - Paper Relations: 2
  - Subscriptions: 2
  `);
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

