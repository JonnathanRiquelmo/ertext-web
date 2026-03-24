Some of the features already implemented and others planned or partially made are shown below.

***

<div align="center">

:heavy_check_mark: - **Supported** | :eight_spoked_asterisk: - **Partly Supported**  | :x: - **Not Supported** | :wavy_dash: - **Not Applicable**

</div>

***

| **ERtext Feature** | **Language** | **Generators** | **Additional Info** |
|---|---|---|---|
| Entities | :heavy_check_mark: | :heavy_check_mark: | Does not discriminate between strong vs weak entities |
| Referential Attribute | :heavy_check_mark: | :heavy_check_mark: | `` isIdentifier `` |
| Descriptive Attribute | :heavy_check_mark: | :heavy_check_mark: | Datatypes are required <br>``int`` ``double`` ``money`` ``string`` <br> ``boolean`` ``datetime`` ``file`` |
| Composite Attribute | :x: | :x: |  |
| Multi-valued Attribute | :x: | :x: |  |
| Derived Attribute | :x: | :x: |  |
| Optional Attribute | :x: | :x: |  |
| Binary Relationship | :heavy_check_mark: | :heavy_check_mark: | ``entX (0:1) relates (0:1) entY`` |
| Ternary Relationship | :heavy_check_mark: | :heavy_check_mark: | Implied statement |
| N-ary Relationship | :x: | :x: | Only binary and ternary |
| Self-relationship | :heavy_check_mark: | :heavy_check_mark: | ``entX (0:1) relates (0:1) entX`` |
| Roles | :x: | :x: |  |
| Relationship Attributes | :heavy_check_mark: | :heavy_check_mark: |  |
| Cardinalities | :heavy_check_mark: | :heavy_check_mark: | ``(0:1) (1:1) (0:N) (1:N) `` <br><br> Cardinality constraints also supported |
| Generalization | :heavy_check_mark: | :heavy_check_mark: | `` is total/disjoint`` `` is total/overlapped`` <br> `` is partial/disjoint`` `` is partial/overlapped`` |
| Conceptual Diagram | :heavy_check_mark: | :heavy_check_mark: | ``Generate Diagram`` |
| Logical Model | :heavy_check_mark: | :heavy_check_mark: | ``Generate LogicalSchema`` |
| Physical Model | :heavy_check_mark: | :heavy_check_mark: | SQL statements with ``Generate MySQL`` or ``Generate PostgreSQL``<br> Support for PostgreSQL and MySQL models |
| Occurrence Diagram | :heavy_check_mark: | :heavy_check_mark: | Generates occurrence diagrams for annotated relationships <br> ``@generateOccurrenceDiagram`` |
| Code template Proposals | :heavy_check_mark: | :wavy_dash: | Ctrl+Space |
| Full Template Proposals | :eight_spoked_asterisk: | :wavy_dash: | Available in the project or file creation wizard |
| Code Mining | :eight_spoked_asterisk: | :wavy_dash: | Adds a header to the modeling file with a info summary |