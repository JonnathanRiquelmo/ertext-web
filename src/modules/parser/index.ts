import type { ModuleDescriptor } from '../../shared/types/contracts';
import type {
  AttributeNode,
  DataType,
  DomainBlockNode,
  EntityGeneralization,
  EntityNode,
  EntitiesBlockNode,
  ErdslDocumentNode,
  GenerateBlockNode,
  GenerateTarget,
  ParseResult,
  ParserDiagnostic,
  RelationCardinality,
  RelationSideNode,
  RelationTargetKind,
  RelationshipNode,
  RelationshipsBlockNode,
  SourcePosition,
  SourceSpan
} from '../ast';

const ERDSL_GRAMMAR = `
ERModel:
('Generate' targetGenerator=('LogicalSchema' | 'PostgreSQL' | 'MySQL' | 'Diagram' | 'OccurrenceDiagram' | 'All') ';')?
domain=Domain ';'
('Entities' '{') entities+=Entity+ ('}' ';')
('Relationships' '{') relations+=Relation* ('}' ';');

Domain:
'Domain' name=ID;

Attribute:
name=ID type=DataType (isKey?='isIdentifier')?;

Entity:
name=ID ('is' generalization=('total/disjoint' | 'total/overlapped' | 'partial/disjoint' | 'partial/overlapped') is=[Entity])?
('{' attributes+=Attribute (',' attributes+=Attribute)* '}')?;

Relation:
(name=ID) ('[' leftEnding=RelationSideLeft 'relates' rightEnding=RelationSideRight ']')
('{' attributes+=Attribute (',' attributes+=Attribute)* '}')* occurrence=('@generateOccurrenceDiagram')?;
`;

const RESERVED_WORDS = new Set([
  'Generate',
  'Domain',
  'Entities',
  'Relationships',
  'is',
  'relates',
  'isIdentifier',
  'total',
  'partial',
  'disjoint',
  'overlapped'
]);

const GENERATE_TARGETS = new Set<GenerateTarget>([
  'All',
  'Diagram',
  'LogicalSchema',
  'MySQL',
  'PostgreSQL',
  'OccurrenceDiagram'
]);

const DATA_TYPES = new Set<DataType>([
  'int',
  'double',
  'money',
  'string',
  'boolean',
  'datetime',
  'file'
]);

const GENERALIZATIONS = new Set<EntityGeneralization>([
  'total/disjoint',
  'total/overlapped',
  'partial/disjoint',
  'partial/overlapped'
]);
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

type TokenType =
  | 'identifier'
  | 'semicolon'
  | 'comma'
  | 'lbrace'
  | 'rbrace'
  | 'lbracket'
  | 'rbracket'
  | 'lparen'
  | 'rparen'
  | 'colon'
  | 'slash'
  | 'atOccurrence'
  | 'eof';

interface Token {
  readonly type: TokenType;
  readonly value: string;
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

class ParseError extends Error {
  public readonly diagnostic: ParserDiagnostic;

  public constructor(diagnostic: ParserDiagnostic) {
    super(diagnostic.message);
    this.diagnostic = diagnostic;
  }
}

class Lexer {
  private readonly source: string;
  private offset = 0;
  private line = 1;
  private column = 1;

  public constructor(source: string) {
    this.source = source;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isAtEnd()) {
        break;
      }
      tokens.push(this.readToken());
    }

    const eofPosition = this.position();
    tokens.push({ type: 'eof', value: '', start: eofPosition, end: eofPosition });
    return tokens;
  }

  private readToken(): Token {
    const start = this.position();
    const current = this.peek();

    if (this.isAlpha(current) || current === '_' || this.isDigit(current)) {
      const value = this.readIdentifier();
      return { type: 'identifier', value, start, end: this.position() };
    }

    switch (current) {
      case ';':
        this.advance();
        return { type: 'semicolon', value: ';', start, end: this.position() };
      case ',':
        this.advance();
        return { type: 'comma', value: ',', start, end: this.position() };
      case '{':
        this.advance();
        return { type: 'lbrace', value: '{', start, end: this.position() };
      case '}':
        this.advance();
        return { type: 'rbrace', value: '}', start, end: this.position() };
      case '[':
        this.advance();
        return { type: 'lbracket', value: '[', start, end: this.position() };
      case ']':
        this.advance();
        return { type: 'rbracket', value: ']', start, end: this.position() };
      case '(':
        this.advance();
        return { type: 'lparen', value: '(', start, end: this.position() };
      case ')':
        this.advance();
        return { type: 'rparen', value: ')', start, end: this.position() };
      case ':':
        this.advance();
        return { type: 'colon', value: ':', start, end: this.position() };
      case '/':
        this.advance();
        return { type: 'slash', value: '/', start, end: this.position() };
      case '@':
        if (this.source.startsWith('@generateOccurrenceDiagram', this.offset)) {
          for (let index = 0; index < '@generateOccurrenceDiagram'.length; index += 1) {
            this.advance();
          }
          return {
            type: 'atOccurrence',
            value: '@generateOccurrenceDiagram',
            start,
            end: this.position()
          };
        }
        break;
      default:
        break;
    }

    throw new ParseError({
      code: 'ERDSL_UNEXPECTED_CHARACTER',
      message: `Unexpected character "${current}".`,
      line: start.line,
      column: start.column
    });
  }

  private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
        this.advance();
        continue;
      }
      if (char === '/' && this.peekNext() === '/') {
        this.advance();
        this.advance();
        while (!this.isAtEnd() && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }
      if (char === '/' && this.peekNext() === '*') {
        const start = this.position();
        this.advance();
        this.advance();
        while (!this.isAtEnd() && !(this.peek() === '*' && this.peekNext() === '/')) {
          this.advance();
        }
        if (this.isAtEnd()) {
          throw new ParseError({
            code: 'ERDSL_UNTERMINATED_COMMENT',
            message: 'Unterminated block comment.',
            line: start.line,
            column: start.column
          });
        }
        this.advance();
        this.advance();
        continue;
      }
      return;
    }
  }

  private readIdentifier(): string {
    let value = '';
    while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
      value += this.advance();
    }
    return value;
  }

  private isAtEnd(): boolean {
    return this.offset >= this.source.length;
  }

  private peek(): string {
    return this.source[this.offset] ?? '\0';
  }

  private peekNext(): string {
    return this.source[this.offset + 1] ?? '\0';
  }

  private advance(): string {
    const character = this.source[this.offset] ?? '\0';
    this.offset += 1;
    if (character === '\n') {
      this.line += 1;
      this.column = 1;
    } else {
      this.column += 1;
    }
    return character;
  }

  private position(): SourcePosition {
    return {
      line: this.line,
      column: this.column,
      offset: this.offset
    };
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}

class Parser {
  private readonly tokens: Token[];
  private current = 0;

  public constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parseDocument(): ErdslDocumentNode {
    let generate: GenerateBlockNode | null = null;
    if (this.matchIdentifier('Generate')) {
      generate = this.parseGenerateBlock();
    }

    const domain = this.parseDomainBlock();
    this.consume('semicolon', 'Expected ";" after Domain rule terminator.');
    const entities = this.parseEntitiesBlock();
    const relationships = this.parseRelationshipsBlock();
    this.consume('eof', 'Unexpected tokens after document end.');

    this.validateReferences(entities, relationships);
    this.validateSemantics(entities);

    return {
      id: 'document',
      kind: 'ErdslDocument',
      span: {
        start: (generate ?? domain).span.start,
        end: relationships.span.end
      },
      generate,
      domain,
      entities,
      relationships
    };
  }

  private parseGenerateBlock(): GenerateBlockNode {
    const keyword = this.previous();
    const token = this.consume('identifier', 'Expected generation target.');
    const target = token.value as GenerateTarget;
    if (!GENERATE_TARGETS.has(target)) {
      this.fail('ERDSL_INVALID_GENERATE_TARGET', `Invalid Generate target "${token.value}".`, token.start);
    }
    const semicolon = this.consume('semicolon', 'Expected ";" after Generate block.');
    return {
      id: 'generate',
      kind: 'GenerateBlock',
      span: this.span(keyword.start, semicolon.end),
      target
    };
  }

  private parseDomainBlock(): DomainBlockNode {
    const keyword = this.consumeIdentifier('Expected "Domain" keyword.', 'Domain');
    const domainName = this.consumeIdentifier('Expected domain name.');
    return {
      id: `domain:${this.normalize(domainName.value)}`,
      kind: 'DomainBlock',
      name: domainName.value,
      span: this.span(keyword.start, domainName.end)
    };
  }

  private parseEntitiesBlock(): EntitiesBlockNode {
    const keyword = this.consumeIdentifier('Expected "Entities" keyword.', 'Entities');
    this.consume('lbrace', 'Expected "{" after Entities.');

    const entities: EntityNode[] = [];
    while (!this.check('rbrace') && !this.check('eof')) {
      entities.push(this.parseEntity());
    }

    if (entities.length === 0) {
      this.fail('ERDSL_ENTITIES_EMPTY', 'Entities block must contain at least one entity.', keyword.start);
    }

    this.consume('rbrace', 'Expected "}" after Entities block.');
    const end = this.consume('semicolon', 'Expected ";" after Entities block.');
    return {
      id: 'entities',
      kind: 'EntitiesBlock',
      entities,
      span: this.span(keyword.start, end.end)
    };
  }

  private parseEntity(): EntityNode {
    const name = this.consumeIdentifier('Expected entity name.');
    const start = name.start;

    let generalization: EntityGeneralization | null = null;
    let superEntity: string | null = null;
    if (this.matchIdentifier('is')) {
      const completeness = this.consume('identifier', 'Expected generalization completeness.');
      this.consume('slash', 'Expected "/" in entity generalization.');
      const disjointness = this.consume('identifier', 'Expected generalization disjointness.');
      const combined = `${completeness.value}/${disjointness.value}` as EntityGeneralization;
      if (!GENERALIZATIONS.has(combined)) {
        this.fail('ERDSL_INVALID_GENERALIZATION', `Invalid generalization "${combined}".`, completeness.start);
      }
      generalization = combined;
      superEntity = this.consumeIdentifier('Expected referenced super-entity name.').value;
    }

    const attributes: AttributeNode[] = [];
    let end = name.end;
    if (this.match('lbrace')) {
      attributes.push(this.parseAttribute(name.value));
      while (this.match('comma')) {
        attributes.push(this.parseAttribute(name.value));
      }
      const close = this.consume('rbrace', 'Expected "}" after entity attributes.');
      end = close.end;
    }

    return {
      id: `entity:${this.normalize(name.value)}`,
      kind: 'Entity',
      name: name.value,
      generalization,
      superEntity,
      attributes,
      span: this.span(start, end)
    };
  }

  private parseAttribute(ownerName: string): AttributeNode {
    const name = this.consumeIdentifier('Expected attribute name.');
    const dataTypeToken = this.consumeIdentifier('Expected attribute data type.');
    if (!DATA_TYPES.has(dataTypeToken.value as DataType)) {
      this.fail(
        'ERDSL_INVALID_DATA_TYPE',
        `Invalid attribute data type "${dataTypeToken.value}".`,
        dataTypeToken.start
      );
    }
    const isIdentifier = this.matchIdentifier('isIdentifier');
    return {
      id: `owner:${this.normalize(ownerName)}:attribute:${this.normalize(name.value)}`,
      kind: 'Attribute',
      name: name.value,
      dataType: dataTypeToken.value as DataType,
      isIdentifier,
      span: this.span(name.start, isIdentifier ? this.previous().end : dataTypeToken.end)
    };
  }

  private parseRelationshipsBlock(): RelationshipsBlockNode {
    const keyword = this.consumeIdentifier('Expected "Relationships" keyword.', 'Relationships');
    this.consume('lbrace', 'Expected "{" after Relationships.');

    const relationships: RelationshipNode[] = [];
    while (!this.check('rbrace') && !this.check('eof')) {
      relationships.push(this.parseRelationshipDefinition());
    }

    this.consume('rbrace', 'Expected "}" after Relationships block.');
    const end = this.consume('semicolon', 'Expected ";" after Relationships block.');
    return {
      id: 'relationships',
      kind: 'RelationshipsBlock',
      relationships,
      span: this.span(keyword.start, end.end)
    };
  }

  private parseRelationshipDefinition(): RelationshipNode {
    const name = this.consumeIdentifier('Expected relationship name.');
    const start = name.start;
    this.consume('lbracket', 'Expected "[" after relationship name.');
    const leftSide = this.parseRelationLeftSide(name.value);
    this.consumeIdentifier('Expected "relates" keyword.', 'relates');
    const rightSide = this.parseRelationRightSide(name.value);
    this.consume('rbracket', 'Expected "]" after relation sides.');

    const attributes: AttributeNode[] = [];
    let end = this.previous().end;
    while (this.match('lbrace')) {
      attributes.push(this.parseAttribute(name.value));
      while (this.match('comma')) {
        attributes.push(this.parseAttribute(name.value));
      }
      const close = this.consume('rbrace', 'Expected "}" after relation attribute block.');
      end = close.end;
    }

    const occurrence = this.match('atOccurrence');
    if (occurrence) {
      end = this.previous().end;
    }

    return {
      id: `relationship:${this.normalize(name.value)}`,
      kind: 'Relationship',
      name: name.value,
      leftSide,
      rightSide,
      attributes,
      occurrence,
      span: this.span(start, end)
    };
  }

  private parseRelationLeftSide(ownerName: string): RelationSideNode {
    const target = this.consumeIdentifier('Expected left-side target reference.');
    const cardinality = this.parseCardinality();
    return {
      id: `relationship:${this.normalize(ownerName)}:left`,
      kind: 'RelationSide',
      target: target.value,
      cardinality,
      targetKind: null,
      span: this.span(target.start, this.previous().end)
    };
  }

  private parseRelationRightSide(ownerName: string): RelationSideNode {
    const cardinality = this.parseCardinality();
    const target = this.consumeIdentifier('Expected right-side target reference.');
    return {
      id: `relationship:${this.normalize(ownerName)}:right`,
      kind: 'RelationSide',
      target: target.value,
      cardinality,
      targetKind: null,
      span: this.span(target.start, target.end)
    };
  }

  private parseCardinality(): RelationCardinality {
    const start = this.consume('lparen', 'Expected "(" before cardinality.');
    const min = this.consume('identifier', 'Expected cardinality minimum value.');
    this.consume('colon', 'Expected ":" inside cardinality.');
    const max = this.consume('identifier', 'Expected cardinality maximum value.');
    this.consume('rparen', 'Expected ")" after cardinality.');
    const literal = `(${min.value}:${max.value})` as RelationCardinality;
    if (!['(0:1)', '(1:1)', '(0:N)', '(1:N)'].includes(literal)) {
      this.fail('ERDSL_INVALID_CARDINALITY', `Invalid cardinality "${literal}".`, start.start);
    }
    return literal;
  }

  private validateSemantics(entities: EntitiesBlockNode): void {
    for (const entity of entities.entities) {
      if (entity.superEntity) {
        continue;
      }
      
      const hasIdentifier = entity.attributes.some((attr) => attr.isIdentifier);
      if (!hasIdentifier) {
        this.fail(
          'ERDSL_MISSING_IDENTIFIER',
          `A entidade ${entity.name} não possui atributo identificador.`,
          entity.span.start
        );
      }
    }
  }

  private validateReferences(entities: EntitiesBlockNode, relationships: RelationshipsBlockNode): void {
    const entityNames = new Set<string>();
    for (const entity of entities.entities) {
      if (entityNames.has(entity.name)) {
        this.fail('ERDSL_DUPLICATE_ENTITY', `Duplicate entity "${entity.name}".`, entity.span.start);
      }
      entityNames.add(entity.name);
    }

    const relationshipNames = new Set<string>();
    for (const relationship of relationships.relationships) {
      if (relationshipNames.has(relationship.name)) {
        this.fail(
          'ERDSL_DUPLICATE_RELATIONSHIP',
          `Duplicate relationship "${relationship.name}".`,
          relationship.span.start
        );
      }
      relationshipNames.add(relationship.name);
    }

    for (const entity of entities.entities) {
      if (entity.superEntity && !entityNames.has(entity.superEntity)) {
        this.fail(
          'ERDSL_UNKNOWN_ENTITY_REFERENCE',
          `Entity "${entity.name}" references unknown super-entity "${entity.superEntity}".`,
          entity.span.start
        );
      }
    }

    for (const relationship of relationships.relationships) {
      this.resolveRelationSideTarget(relationship.leftSide, relationship, entityNames, relationshipNames);
      this.resolveRelationSideTarget(relationship.rightSide, relationship, entityNames, relationshipNames);
    }
  }

  private resolveRelationSideTarget(
    side: RelationSideNode,
    relationship: RelationshipNode,
    entityNames: Set<string>,
    relationshipNames: Set<string>
  ): void {
    const inEntities = entityNames.has(side.target);
    const inRelationships = relationshipNames.has(side.target);
    if (!inEntities && !inRelationships) {
      const normalizedTarget = side.target.toLowerCase();
      const matchingEntity = Array.from(entityNames).find(
        (entityName) => entityName.toLowerCase() === normalizedTarget
      );
      const matchingRelationship = Array.from(relationshipNames).find(
        (relationshipName) => relationshipName.toLowerCase() === normalizedTarget
      );
      if (matchingEntity || matchingRelationship) {
        const suggestedTarget = matchingEntity ?? matchingRelationship;
        this.fail(
          'ERDSL_CASE_MISMATCH_REFERENCE',
          `Relationship "${relationship.name}" references "${side.target}" with incorrect casing. Did you mean "${suggestedTarget}"?`,
          side.span.start
        );
      }
      this.fail(
        'ERDSL_UNKNOWN_RELATION_TARGET',
        `Relationship "${relationship.name}" references unknown target "${side.target}".`,
        side.span.start
      );
    }
    if (inEntities && inRelationships) {
      this.fail(
        'ERDSL_AMBIGUOUS_TARGET',
        `Target "${side.target}" is ambiguous (entity and relationship).`,
        side.span.start
      );
    }
    const targetKind: RelationTargetKind = inEntities ? 'Entity' : 'Relation';
    (side as { targetKind: RelationTargetKind }).targetKind = targetKind;
  }

  private consumeIdentifier(message: string, exactValue?: string): Token {
    const token = this.consume('identifier', message);
    if (exactValue !== undefined && token.value !== exactValue) {
      this.fail('ERDSL_UNEXPECTED_TOKEN', `${message} Received "${token.value}".`, token.start);
    }
    if (exactValue === undefined && !IDENTIFIER_PATTERN.test(token.value)) {
      this.fail(
        'ERDSL_INVALID_IDENTIFIER',
        `Invalid identifier "${token.value}". Use letters, digits, and "_" (cannot start with a digit).`,
        token.start
      );
    }
    if (RESERVED_WORDS.has(token.value) && exactValue === undefined) {
      this.fail('ERDSL_RESERVED_KEYWORD', `Keyword "${token.value}" cannot be used here.`, token.start);
    }
    return token;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    const token = this.peek();
    this.fail('ERDSL_UNEXPECTED_TOKEN', message, token.start);
  }

  private fail(code: string, message: string, position: SourcePosition): never {
    throw new ParseError({
      code,
      message,
      line: position.line,
      column: position.column
    });
  }

  private span(start: SourcePosition, end: SourcePosition): SourceSpan {
    return { start, end };
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private match(type: TokenType): boolean {
    if (!this.check(type)) {
      return false;
    }
    this.advance();
    return true;
  }

  private matchIdentifier(value: string): boolean {
    if (!this.check('identifier')) {
      return false;
    }
    if (this.peek().value !== value) {
      return false;
    }
    this.advance();
    return true;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) {
      return type === 'eof';
    }
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current += 1;
    }
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'eof';
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}

export function parseErdsl(source: string): ParseResult {
  try {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parseDocument();
    return {
      ok: true,
      ast,
      diagnostics: []
    };
  } catch (error) {
    if (error instanceof ParseError) {
      return {
        ok: false,
        ast: null,
        diagnostics: [error.diagnostic]
      };
    }

    throw error;
  }
}

export { ERDSL_GRAMMAR };

export const ParserModule: ModuleDescriptor = {
  name: 'parser',
  status: 'ready'
};
