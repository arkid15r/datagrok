class PedometerPackageDetectors extends grok.Package {

    //tags: semTypeDetector
    //input: column col
    //output: string semType
    detectAccel(col) {
        if ((col.type === TYPE_FLOAT || col.type === TYPE_INT) && col.name.startsWith('accel_') && col.name.length === 7) {
            col.semType = 'Accelerometer-' + col.name.substring(6).toUpperCase();
            return col.semType;
        }

        return null;
    }

    //tags: semTypeDetector
    //input: column col
    //output: string semType
    detectTimeOffset(col) {
        if (col.type === TYPE_FLOAT && col.name === 'time_offset') {
            col.semType = 'Time-Offset';
            return col.semType;
        }

        return null;
    }

    //input: dataframe table
    //output: bool result
    stepCounterCondition(table) {
        if (table.columns.length >= 4) {
            let columns = table.columns.toList();

            function checkSemType(semType) {
                return columns.some((c) => c.semType === semType)
            }

            if (checkSemType('Accelerometer-X') && checkSemType('Accelerometer-Y') &&
                checkSemType('Accelerometer-Z') && checkSemType('Time-Offset'))
                return true;
        }

        return false;
    }
}
