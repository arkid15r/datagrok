class ChemblPackageDetectors extends grok.Package {

    //tags: semTypeDetector
    //input: column col
    //output: string semType
    detectMolRegNo(col) {
        if (col.name === 'molregno')
            return 'chembl:molregno';
        return null;
    }
}
