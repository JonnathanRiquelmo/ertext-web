export type TemplateTheme =
  | 'university-courses'
  | 'social-network'
  | 'artificial-intelligence'
  | 'supply-chain-logistics';

export interface TemplateMetadata {
  readonly id: string;
  readonly name: string;
  readonly theme: TemplateTheme;
  readonly themeLabel: string;
}

export interface TemplateContent {
  readonly dsl: string;
  readonly startupPreviewDsl?: string;
  readonly startupPreviewCaption?: string;
  readonly startupFoldRanges?: readonly (readonly [start: number, end: number])[];
}

export interface TemplateDefinition {
  readonly metadata: TemplateMetadata;
  readonly content: TemplateContent;
}

const TEMPLATE_DEFINITIONS: readonly TemplateDefinition[] = [
  {
    metadata: {
      id: 'university-courses',
      name: 'Cursos Universitários',
      theme: 'university-courses',
      themeLabel: 'Cursos Universitários'
    },
    content: {
      dsl: `Generate All;
Domain University_Courses;
Entities {
  Student { studentId int isIdentifier, fullName string, enrollmentDate datetime }
  Course { courseId int isIdentifier, title string, creditHours int }
  Instructor { instructorId int isIdentifier, fullName string, department string }
};
Relationships {
  Enrollment [ Student (0:N) relates (0:N) Course ] { enrolledAt datetime }
  TeachingAssignment [ Instructor (1:1) relates (0:N) Course ]
  Mentors [ Instructor (0:1) relates (0:N) Instructor ]
};`
    }
  },
  {
    metadata: {
      id: 'social-network',
      name: 'Rede Social',
      theme: 'social-network',
      themeLabel: 'Rede Social'
    },
    content: {
      dsl: `Domain Social_Network;
Entities {
  User {
    idUser int isIdentifier,
    loginEmail string,
    loginPassword string
  }
  People is total/disjoint User {
    name string,
    birthday datetime
  }
  Organization is total/disjoint User {
    fantasyName string
  }
  Posts {
    idPost int isIdentifier,
    contents string,
    dateCreated datetime,
    dateModified datetime
  }
  Photos {
    idPhoto int isIdentifier,
    image file
  }
  Groups {
    idGroup int isIdentifier,
    title string,
    description string
  }
  Roles {
    idRole int isIdentifier,
    description string,
    permissionLevel int
  }
};
Relationships {
  Friendship     [ User (0:N) relates (1:N) User ] { date datetime }
  PostSharing    [ User (1:1) relates (0:N) Posts ]
  photoPost      [ Posts (1:1) relates (0:N) Photos ]
  BelongsToGroup [ User (0:N) relates (0:N) Groups ]
  RoleInTheGroup [ Roles (1:1) relates (1:N) BelongsToGroup ]
};`,
      startupPreviewDsl: `Domain Social_Network;
Entities {
  User {
    idUser int isIdentifier,
    loginEmail string,
    loginPassword string
  }
  People is total/disjoint User {
    name string,
    birthday datetime
  }
  Organization is total/disjoint User {
    fantasyName string
  }
  Posts {
    idPost int isIdentifier,
    contents string,
    dateCreated datetime,
    dateModified datetime
  }
  Photos {
    idPhoto int isIdentifier,
    image file
  }
  Groups {
    idGroup int isIdentifier,
    title string,
    description string
  }
  Roles {
    idRole int isIdentifier,
    description string,
    permissionLevel int
  }
}
Relationships {
  Friendship     [User (0:N) relates (1:N) User] {date datetime}
  PostSharing    [User (1:1) relates (0:N) Posts]
  photoPost      [Posts(1:1) relates (0:N) Photos]
  BelongsToGroup [User (0:N) relates (0:N) Groups]
  RoleInTheGroup [Roles(1:1) relates (1:N) BelongsToGroup]
};`,
      startupPreviewCaption: 'Figura 15 — Descrição de um exemplo de rede social.',
      startupFoldRanges: [
        [2, 6],
        [7, 10],
        [11, 13],
        [14, 19],
        [20, 23],
        [24, 28],
        [29, 33]
      ]
    }
  },
  {
    metadata: {
      id: 'artificial-intelligence',
      name: 'Inteligência Artificial',
      theme: 'artificial-intelligence',
      themeLabel: 'Inteligência Artificial'
    },
    content: {
      dsl: `Generate All;
Domain Artificial_Intelligence;
Entities {
  Model { modelId int isIdentifier, modelName string, modelVersion string }
  Dataset { datasetId int isIdentifier, datasetName string, source string }
  Experiment { experimentId int isIdentifier, owner string, startedAt datetime }
  TrainingRun { runId int isIdentifier, status string, finishedAt datetime }
};
Relationships {
  UsesDataset [ Experiment (1:1) relates (0:N) Dataset ]
  TrainsModel [ Experiment (1:1) relates (1:1) Model ]
  ExecutesRun [ TrainingRun (1:1) relates (0:N) Experiment ]
  ModelLineage [ Model (0:1) relates (0:N) Model ]
};`
    }
  },
  {
    metadata: {
      id: 'supply-chain-logistics',
      name: 'Cadeia de Suprimentos e Logística',
      theme: 'supply-chain-logistics',
      themeLabel: 'Cadeia de Suprimentos e Logística'
    },
    content: {
      dsl: `Generate All;
Domain Supply_Chain_Logistics;
Entities {
  Party { partyId int isIdentifier, legalName string, isActive boolean }
  Individual is partial/disjoint Party { birthDate datetime, annualIncome money }
  Company is partial/overlapped Party { tradeName string, marketShare double }
  PartnerCompany is total/overlapped Company { partnershipSince datetime }
  Warehouse { warehouseId int isIdentifier, capacity double, climateControlled boolean }
  Product { productId int isIdentifier, sku string, listPrice money }
  Shipment { shipmentId int isIdentifier, dispatchedAt datetime }
};
Relationships {
  ReportsTo [ Individual (0:1) relates (0:N) Individual ]
  Stores [ Warehouse (1:1) relates (0:N) Product ] { shelfCode string }
  Ships [ Shipment (1:1) relates (1:N) Product ]
  Supplies [ Company (0:N) relates (0:N) Warehouse ] { contractValue money }
};`
    }
  }
] as const;

const TEMPLATE_DEFINITIONS_BY_ID = new Map<string, TemplateDefinition>(
  TEMPLATE_DEFINITIONS.map((template) => [template.metadata.id, template])
);

export function listTemplateDefinitions(): readonly TemplateDefinition[] {
  return TEMPLATE_DEFINITIONS;
}

export function getTemplateDefinition(templateId: string): TemplateDefinition {
  const definition = TEMPLATE_DEFINITIONS_BY_ID.get(templateId);
  if (!definition) {
    throw new Error(`Unknown template id: ${templateId}`);
  }
  return definition;
}
