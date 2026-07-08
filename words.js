// A large bank of concrete, evocative nouns for seeding business ideas.
// Words are picked server-side with Math.random() so results are genuinely
// varied — asking the model to "pick a random word" tends to collapse onto a
// few favorites (lighthouse, kelp, barnacle...).

export const WORDS = [
  "abacus", "acorn", "airship", "amber", "anchor", "antler", "anvil", "aquarium",
  "arcade", "armor", "ashtray", "avalanche", "aviary", "axle", "backpack", "bagpipe",
  "balcony", "bamboo", "banjo", "barometer", "basket", "beacon", "beehive", "bellows",
  "binoculars", "blacksmith", "blizzard", "blueprint", "bobsled", "bonfire", "boomerang",
  "bottlecap", "boulder", "bracelet", "bramble", "brewery", "bridge", "bristle", "bullhorn",
  "buoy", "cactus", "cairn", "caldera", "campfire", "candle", "canoe", "canyon", "capsule",
  "caravan", "cardboard", "carousel", "cartography", "cassette", "catapult", "cauldron",
  "cavern", "cello", "chandelier", "chalk", "chariot", "chessboard", "chimney", "cinder",
  "citadel", "clockwork", "cloister", "cobblestone", "cocoon", "compass", "confetti",
  "constellation", "coral", "corkscrew", "cottage", "crane", "crater", "crayon", "crossbow",
  "crown", "crystal", "cufflink", "cyclone", "dandelion", "decoy", "delta", "dial", "diorama",
  "dirigible", "domino", "doorbell", "dovetail", "dragonfly", "driftwood", "drumbeat", "dune",
  "dynamo", "easel", "eclipse", "ember", "engine", "estuary", "fable", "falcon", "fathom",
  "feather", "ferry", "fiddle", "figurine", "filament", "firefly", "fjord", "flannel", "flask",
  "flint", "floret", "flotilla", "flute", "foghorn", "foundry", "fountain", "fossil", "fresco",
  "frostbite", "funnel", "gargoyle", "gaslight", "gazebo", "geyser", "ginger", "glacier",
  "glassblower", "glider", "gondola", "granary", "grapevine", "greenhouse", "grindstone",
  "grotto", "gyroscope", "hammock", "harbor", "harmonica", "harpoon", "hatchet", "hayloft",
  "hedgehog", "helm", "hologram", "honeycomb", "hourglass", "hovercraft", "hummingbird",
  "hydrant", "iceberg", "igloo", "inkwell", "iris", "ironwork", "ivy", "jamboree", "jetty",
  "jigsaw", "juniper", "kaleidoscope", "kayak", "kettle", "keystone", "kiln", "kingfisher",
  "kite", "lagoon", "lantern", "lasso", "lattice", "lava", "ledger", "lichen", "lifeboat",
  "lightning", "locket", "locomotive", "loom", "lozenge", "lumberyard", "magnet", "mailbox",
  "mandolin", "mangrove", "marble", "marionette", "marsh", "mast", "meadow", "megaphone",
  "meridian", "meteor", "microscope", "millstone", "minaret", "mirage", "monsoon", "mosaic",
  "moss", "mural", "mushroom", "nautilus", "nebula", "nectar", "nest", "nightingale", "nomad",
  "notebook", "oasis", "obelisk", "observatory", "orchard", "origami", "otter", "outrigger",
  "paddle", "pagoda", "palette", "pantry", "parachute", "parchment", "pavilion", "pebble",
  "pendulum", "periscope", "pinwheel", "pistachio", "piston", "plankton", "plinth", "plow",
  "poncho", "prism", "propeller", "pulley", "pumpkin", "quarry", "quartz", "quicksand",
  "quill", "quiver", "radish", "raft", "rampart", "ravine", "reef", "reservoir", "rhubarb",
  "ricochet", "riverbed", "rooftop", "ropeway", "rowboat", "rudder", "sailcloth", "sandbar",
  "sapling", "satchel", "sawdust", "scaffold", "scarecrow", "seashell", "seismograph",
  "semaphore", "sextant", "shipyard", "shoreline", "sickle", "silo", "sinkhole", "skeleton",
  "sleigh", "snorkel", "snowdrift", "solstice", "sonar", "spelunker", "spindle", "spire",
  "spork", "sprocket", "steeple", "stethoscope", "stilts", "stopwatch", "sundial", "sunflower",
  "surfboard", "swamp", "tambourine", "tapestry", "teapot", "telescope", "tempest", "terrarium",
  "thimble", "thistle", "thunder", "tidepool", "timber", "tollbooth", "tornado", "totem",
  "trampoline", "treehouse", "trellis", "tributary", "trombone", "tumbleweed", "tundra",
  "turbine", "turnstile", "typewriter", "umbrella", "vane", "velvet", "vending", "vineyard",
  "violin", "volcano", "wagon", "walnut", "waterfall", "waterwheel", "weathervane", "whirlpool",
  "whistle", "wickerwork", "windmill", "wishbone", "workshop", "yarn", "yurt", "zeppelin",
  "zipline", "zither",
];

export function pickRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

export function pickRandomWords(n) {
  const pool = [...WORDS];
  const out = [];
  const count = Math.min(n, pool.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
