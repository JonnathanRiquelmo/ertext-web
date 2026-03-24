The definition of our DSL using a variation of the EBNF metasyntax notation is shown below.


***


``` xtend
ERModel:
	('Generate' targetGenerator= ('LogicalSchema' | 'PostgreSQL' | 'MySQL' | 'Diagram' | 'All') ';')?
	domain=Domain ';'
	('Entities' '{') entities+=Entity+ ('}' ';')
	('Relationships' '{') relations+=Relation* ('}' ';');

Domain:
	'Domain' name=ID;

Attribute:
	name=ID type=DataType (isKey?='isIdentifier')?;

Entity:
	name=ID ('is' generalization=('total/disjoint' | 'total/overlapped' | 'partial/disjoint' | 'partial/overlapped') is=[Entity])?
	('{' attributes+=Attribute
	(',' attributes+=Attribute)* '}')?;

Relation:
	(name=ID) ('[' leftEnding=RelationSideLeft
	'relates'
	rightEnding=RelationSideRight ']')
	('{' attributes+=Attribute
	(',' attributes+=Attribute)* '}')* occurrence=('@generateOccurrenceDiagram')?;

RelationSideRight:
	cardinality=('(0:1)' | '(1:1)' | '(0:N)' | '(1:N)')
	target=[Entity] | target=[Relation];
	
RelationSideLeft:
	target=[Entity] | target=[Relation]
	cardinality=('(0:1)' | '(1:1)' | '(0:N)' | '(1:N)') ;

enum DataType:
	INT='int' | DOUBLE='double' |
	MONEY='money' | STRING='string' |
	BOOLEAN='boolean' | DATETIME='datetime' |
	BLOB='file';
```

## Detailed Explanation of DSL Definition

The `grammar` command speciﬁes the name of the DSL, while the `with` statement declares an inheritance from another language. In the case of the proposed grammar, a standard Xtext grammar called `Terminals` is used, which provides some predeﬁned rules, such as the ID rule for identiﬁers. The generate command is the statement that produces the AST of the language.

The ﬁrst rule, called the input rule, is `ERModel` and deﬁnes the general structure of the language. Words and symbols enclosed in double or single quotes indicate reserved words (keywords). For example, the `Entities` object must be preceded by "`Entities{`". This object represents a kind of _container_, which is indicated by the `+=` assignment op- erator. It is an object that can contain other objects, in this case, one or more `Entity` (entities). It is established that each DSL ﬁle must also be composed of a `Domain` (domain) and zero or more `Relation` (relations). In addition, a ﬁle optionally contains a `Generate` command, which indicates which ﬁle(s) should be generated.

For a better understanding, it should be clear that the multiplicity is indicated by `*` (zero or many), `+` (one or many), or `?` (zero or one). By not placing any of these operators, the grammar implicitly expects only one occurrence. Regarding assignments, when only one `=` is speciﬁed, it means that the left object expects only one record. So, for `+=` then zero is expected, one or more occurrences, and so forth.

The `Domain` object precedes by a reserved word with the same name, followed by an identiﬁer. The entity is deﬁned by the word `Entity` and a speciﬁc identiﬁer name for this object. Setting an inheritance is optional via the is keyword. When specifying an inheritance, it is necessary to indicate the type among the four (4) possible ones to then point to the inherited class, _e.g._ `EntityB is total/disjoint EntityA`. After deﬁning the name, a curly bracket opens a snippet to specify the entity attributes. An entity must contain at least one attribute, but it does not need to be an identiﬁer due to the possible existence of weak entities.

Composed rules are only performed due to the possibility of grouping expressions using parentheses, in addition to the possibility of using other rules through crossreferences. The square brackets in the is attribute of the `Entity` rule are meant to indicate that we aim to use only the `name` attribute that identiﬁes the referenced object. If this detail is not speciﬁed then the language compiler would interpret that it is neces- sary to apply the whole `Entity` rule again, that is, the mandatory deﬁnition of another entity would be started, thus entering in a loop. Entity attributes are deﬁned by a name, inheriting the `ID` rule from `Terminals`, as well as by a data type. Optionally an attribute can have the keyword `isIdentifier` to symbolize primary keys.

A relationship is deﬁned, already inside the body of the `Relationships` block, with a mandatory declaration of its identiﬁcation. Then square brackets are opened and we must specify two elements that represent the sides of the relationship. These elements are the `RelationSideLeft` and `RelationSideRight`. These objects must be separated by the relates expression. Both elements have two attributes, one indicating cardinality and the other referring to the related object (an entity or other relationship). A relationship can still have attributes declared between curly braces, and for these cases, the `Attribute` rule is applied.

`Attribute` types are contained in an enumerated list called `DataType`, on the left is the representation within the Ecore model and on the right is the keyword available to the user. The conditional symbol `|` means the logical operator _OR_ and serves to separate each `<key> = <value>` deﬁnition as an option within the list.
