/**
 * Minimal type declarations for expo-sqlite's internal native module binding,
 * which is used (internally) for `importAssetDatabaseAsync`. The package's
 * `exports` map does not expose this subpath, so we declare it locally.
 */
declare module "expo-sqlite/build/ExpoSQLite" {
  interface ExpoSQLiteNativeModule {
    importAssetDatabaseAsync(
      databasePath: string,
      assetDatabasePath: string,
      forceOverwrite: boolean,
    ): Promise<void>;
  }
  const _default: ExpoSQLiteNativeModule;
  export default _default;
}