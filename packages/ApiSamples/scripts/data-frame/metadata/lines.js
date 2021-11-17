
let demog = grok.data.demo.demog(100);

/**
 * An example of adding a line with a complete set of parameters to the dataframe.
 * Only one parameter ("equation") is required.
 * All other parameters have their default values.
 */
demog.meta.addLine({
  title: 'Red Line',           // Short title.
  description: 'Description',  // Detailed description.
  // Equation for line.
  // There should be one column to the left of the "=". And any formula using the second column on the right side.
  // The equation uses syntax and formulas similar to the "Add New Column" form.
  equation: '${height} = 0.69 * max($[weight])',
  zindex: -45,         // Line depth. The viewer's chart has a depth of 0.
  color: "#ff0000",    // Line color.
  visible: true,       // Visibility.
  opacity: 0.8,        // Opacity [0..1], where 0 - invisible, 1 - opaque.
  // Line boundaries along the value axis. In this example, the line will be drawn for a "Weight" between 50 and 300 kg.
  min: 50,
  max: 300,
  // Parameters specific to Lines:
  width: 2,            // Line width in pixels.
  spline: 0.9,         // Smoothness of curve line [0..1], where 0 - no smoothing, 1 - max smoothing.
});

/**
 * An example of adding a band to the dataframe. Most of the parameters are the same as for lines.
 * There are two required parameters here - "column" and "equation".
 * All other parameters have their default values.
 */
demog.meta.addBand({
  title: 'My first Band',              // Short title.
  description: 'Band is a rectangle',  // Detailed description.
  // Band boundary formula.
  // The formula can contain expressions of the form: "< 200", "> 50", "in(18, 60)", "in(q1, q3)".
  // The numbers are specified in the units of the column. in this case in centimeters.
  equation: 'in(175, 185)',
  zindex: -15,             // Line depth. The viewer's chart has a depth of 0.
  color: "#FFD700",        // Band background color.
  max: 160,                // Maximum band size.
  // Parameters specific to Bands:
  column: "${height}",     // Column for which the band is set.
  column2: "${weight}",    // Second column for which the band will be drawn.
});

demog.meta.addLine({
  title: 'Blue Line',
  equation: '${weight} = 180',
  color: "#0000ff",
  width: 4,
  opacity: 0.5
});

demog.meta.addLine({
  title: 'Y = X',
  description: 'Some description',
  equation: '${weight} = ${height}',
  width: 1
});

demog.meta.addLine({
  title: 'Parabola',
  equation: '${height} = 180 + 0.01 * ${weight} * ${weight} - 1.5 * ${weight}',
  zindex: -30,
  color: "#FFA500",
  width: 2,
  visible: true,
});

demog.meta.addLine({
  title: 'Green Line',
  equation: '${height} = 140 + ${weight} * 0',
  zindex: -20,
  color: "#00ff00",
  width: 6,
  max: 200
});

demog.meta.addLine({
  title: 'Sinusoid',
  equation: '${height} = 90 + max($[age]) + 4 * sin(0.2 * ${weight} + 60)',
  zindex: -45,
  color: "#00BFFF",
  width: 3,
  visible: true,
  max: 200
});

demog.meta.addLine({
  title: 'Hidden Line',
  equation: '${height} = 2 * ${weight}',
  zindex: -45,
  width: 1,
  visible: false,     // This line will not be displayed.
  opacity: 0.8
});

demog.meta.addLine({
  title: 'Circle Top',
  description: 'Description of circle',
  equation: '${height} = 181.2 + sqrt(pow(25, 2) - pow((${weight} - 108.75), 2)) * 0.34',
  zindex: -40,
  color: "#5F9EA0",
  width: 6
});

demog.meta.addLine({
  title: 'Circle Bottom',
  equation: '${height} = 178.8 - sqrt(pow(25, 2) - pow((${weight} - 108.75), 2)) * 0.34',
  zindex: -40,
  color: "#5F9EA0",
  width: 6
});

demog.meta.addLine({
  title: 'X Top',
  equation: '${height} = 115 + sqrt(pow(20, 2) - pow((${weight} - 188.95), 2)) * 1.0',
  zindex: -45,
  color: "#228B22",
  width: 4
});

demog.meta.addLine({
  title: 'X Bottom',
  equation: '${height} = 147 - sqrt(pow(20, 2) - pow((${weight} - 188.95), 2)) * 1.0',
  zindex: -45,
  color: "#228B22",
  width: 4
});

demog.meta.addBand({
  title: 'Band 2',
  description: 'Second band',
  column: "${weight}",
  equation: '< 80',
  column2: "${height}",
  zindex: -45,
  color: "#FFC0CB",
  opacity: 0.3,
  min: 130
});

demog.meta.addBand({
  title: 'Band 3',
  description: 'Another band',
  column: "${weight}",
  equation: '> max',
  column2: "${height}",
  zindex: -45,
  color: "#7FFFD4",
  opacity: 0.3,
  max: 160
});

let view = grok.shell.addTableView(demog);

let plot = view.scatterPlot({
  x: 'weight',
  y: 'height',
  showDataframeLines: true,         // Hide or show all lines stored in the dataframe.
  showViewerLines: true    // Hide or show all lines stored in the viewer.
});

/**
 * An example of adding a line to the viewer.
 */
plot.meta.addLine({
  equation: '${weight} = 150',
  color: "#ff0000",
  width: 10
});
