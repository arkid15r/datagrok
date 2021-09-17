export class ChemPalette {
  static colourPalette: { [key: string]: string[] } = {
    "orange": ['rgb(255,187,120)', 'rgb(245,167,100)', 'rgb(235,137,70)', 'rgb(205, 111, 71)'],
    "all_green": ['rgb(44,160,44)', 'rgb(74,160,74)', 'rgb(23,103,57)', 'rgb(30,110,96)', 'rgb(60,131,95)', 'rgb(24,110,79)', 'rgb(152,223,138)', 'rgb(182, 223, 138)', 'rgb(152, 193, 138)'],
    "all_blue": ['rgb(31,119,180)', 'rgb(23,190,207)', 'rgb(122, 102, 189)', 'rgb(158,218,229)', 'rgb(141, 124, 217)', 'rgb(31, 120, 150)'],
    "magenta": ['rgb(162,106,192)', 'rgb(197,165,224)', 'rgb(208,113,218)'],
    "red": ['rgb(214,39,40)', 'rgb(255,152,150)'],
    "st_blue": ['rgb(23,190,207)', 'rgb(158,218,229)', 'rgb(31,119,180)'],
    "dark_blue": ['rgb(31,119,180)', 'rgb(31, 120, 150)'],
    "light_blue": ['rgb(23,190,207)', 'rgb(158,218,229)', 'rgb(108, 218, 229)', 'rgb(23,190,227)'],
    "lilac_blue": ['rgb(124,102,211)', 'rgb(149,134,217)', 'rgb(97, 81, 150)'],
    "dark_green": ['rgb(23,103,57)', 'rgb(30,110,96)', 'rgb(60,131,95)', 'rgb(24,110,79)'],
    "green": ['rgb(44,160,44)', 'rgb(74,160,74)'],
    "light_green": ['rgb(152,223,138)', 'rgb(182, 223, 138)', 'rgb(152, 193, 138)'],
    "st_green": ['rgb(44,160,44)', 'rgb(152,223,138)', 'rgb(39, 174, 96)', 'rgb(74,160,74)'],
    "pink": ['rgb(247,182,210)'],
    "brown": ['rgb(140,86,75)', 'rgb(102, 62, 54)'],
    "gray": ['rgb(127,127,127)', 'rgb(199,199,199)', 'rgb(196,156,148)', 'rgb(222, 222, 180)'],
    "yellow": ['rgb(188,189,34)'],
    "white": ['rgb(230,230,230)']
  }


  static make_palette(dt: [string[], string][], simplified = false) {
    let palette: { [key: string]: string } = {}
    dt.forEach((cp) => {
      let obj_list = cp[0];
      let colour = cp[1];
      obj_list.forEach((obj, ind) => {

        palette[obj] = ChemPalette.colourPalette[colour][simplified ? 0 : ind]
      })
    })
    return palette;
  }

  static get_datagrok = () => ChemPalette.make_palette([
    [['C', 'U'], 'yellow'],
    [['G', 'P'], 'red'],
    [['A', 'V', 'I', 'L', 'M', 'F', 'Y', 'W'], 'all_green'],
    [['R', 'H', 'K'], 'light_blue'],
    [['D', 'E'], 'dark_blue'],
    [['S', 'T', 'N', 'Q'], 'orange']]);
  static get_lesk = () => ChemPalette.make_palette([
    [['G', 'A', 'S', 'T'], 'orange'],
    [['C', 'V', 'I', 'L', 'P', 'F', 'Y', 'M', 'W'], "all_green"],
    [['N', 'Q', 'H'], "magenta"],
    [['D', 'E'], "red"],
    [['K', 'R'], "all_blue"]])
}