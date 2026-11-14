# ProjectRack

A personal portfolio presented as a shelf of DVD cases: each project is a disc a visitor pulls off the shelf and plays in a TV. The owner curates the shelf privately; the public sees only the finished work the owner chooses to show.

## Language

### The shelf

**Disc**:
One project on the shelf, with its details (title, description, tech, link) and its look (spine, cover).
_Avoid_: Project, item, card, entry

**Shelf**:
The ordered row of discs.
_Avoid_: Rack, list, grid

**Position**:
A disc's place on the shelf, set by hand by the owner.
_Avoid_: Order, rank, sort

**Spine**:
The narrow face of a disc seen while it sits on the shelf.

**Cover**:
The front face of a disc, shown when it is pulled out and in the player.
_Avoid_: Thumbnail, card

**Cover tag**:
Optional short text on the cover's corner (e.g. a year or version); falls back to "Out now".
_Avoid_: Status label

**Player**:
The TV and disc deck a visitor drops a disc into to see its details.
_Avoid_: Viewer, modal, preview

### Lifecycle and visibility

**Status**:
Where a disc is in its life: Idea, Planned, In progress, Shipped, Paused or Archived.
_Avoid_: Stage, state, WIP flag

**Shipped**:
The status of a disc whose project is finished and usable.
_Avoid_: Out now, released, done

**Shipped on**:
The date a disc became Shipped.

**Public**:
The owner's choice that a disc may be shown to visitors. A separate choice from status.
_Avoid_: Visible, published, live

**Showcased disc**:
A disc that is both Shipped and Public — the only kind a visitor can ever see.
_Avoid_: Public disc (ambiguous with the flag alone)

### People and places

**Owner**:
The single person who curates the shelf. There is exactly one.
_Avoid_: Admin user, author, user

**Visitor**:
Anyone viewing the public site; never signed in.
_Avoid_: User, guest

**Public site**:
The shelf and player as visitors see them, containing only showcased discs.

**Admin**:
The owner's private area for adding, editing, ordering and hiding discs.
_Avoid_: Dashboard, CMS, editor (the editor is one part of Admin)
