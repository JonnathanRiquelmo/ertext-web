### For each design decision we have indicated its associated [**language requirement (RQs)**](https://github.com/JonnathanRiquelmo/ERtext/wiki/Language-Requirements).

***

* ### DD1. The solution should adopt an open-source Language Workbench to help implement the textual DSL (RQ1, RQ2).

We selected [**Xtext**](https://github.com/eclipse/xtext) for the development of the proposal as it is an open-source framework focused on the development of textual DSLs, providing all the necessary infrastructure. Furthermore, Xtext is a tool with a high level of maturity, detailed documentation and an extremely active community.

***

* ### DD2. The DSL must provide a textual representation equivalent to the commonly used graphical ER models (RQ3, RQ4).

For the requirements covered by this design decision, we have adopted the strategy of the reference book by Heuser (2009).

***

* ### DD3. The solution must perform the transformation between models (RQ5). 

Xtext uses EMF templates as the in-memory representation of any parsed text file. This in-memory object graph is called an AST. These concepts are also called DOM, semantic model, or simply model. Thus, there is a representation of the grammar model in the form of a kernel metamodel in the core of EMF, called the Ecore model. Since having the proposed DSL Ecore as a representation, it is possible to apply transformation rules, thus generating other models.

***

* ### DD4. The solution must provide the integration between the DSL and other technologies (RQ6).

The solution should allow the export of the built models to an SQL statement format, thus representing the physical model. Initially we perform this integration for PostgreSQL and MySQL

***

* ### DD5. The solution should provide the generation and visualization of diagrams of the models built with DSL (RQ7).

The solution must allow the visualization of data models built using a graphical format and representing the conceptual model. Initially we perform this integration using [**PlantUML**](https://github.com/plantuml). PlantUML is an open-source tool that allows the creation of diagrams from a simple text language.